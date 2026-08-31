<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'

const MAX_FILES = 5
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_TOTAL_BYTES = 30 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

const dialog = ref(null)
const firstField = ref(null)
const fileInput = ref(null)
const showDiscardConfirm = ref(false)
const submitNotice = ref('')
const fileError = ref('')
const fieldErrors = reactive({})
const files = ref([])
const form = reactive({ requestType: '', relatedPage: '', identity: '', contact: '', details: '' })

const isRemoval = computed(() => form.requestType === 'removal')
const isDirty = computed(() => (
  Object.entries(form)
    .filter(([key]) => key !== 'requestType')
    .some(([, value]) => value.trim())
  || files.value.length > 0
))

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function revokeFiles() {
  files.value.forEach((item) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  })
}

function resetForm() {
  revokeFiles()
  Object.assign(form, { requestType: '', relatedPage: '', identity: '', contact: '', details: '' })
  files.value = []
  if (fileInput.value) fileInput.value.value = ''
  Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key])
  showDiscardConfirm.value = false
  submitNotice.value = ''
  fileError.value = ''
}

async function open(context = {}) {
  if (!dialog.value?.open) dialog.value?.showModal()
  document.documentElement.classList.add('is-drawer-open')
  if (context.relatedPage) form.relatedPage = context.relatedPage
  await nextTick()
  firstField.value?.focus()
}

function finishClose() {
  dialog.value?.close()
  document.documentElement.classList.remove('is-drawer-open')
  resetForm()
}

function continueEditing() {
  showDiscardConfirm.value = false
  nextTick(() => firstField.value?.focus())
}

async function requestClose() {
  if (isDirty.value) {
    showDiscardConfirm.value = true
    await nextTick()
    dialog.value?.querySelector('.discard-confirm__actions .button')?.focus()
    return
  }
  finishClose()
}

function closeOnBackdrop(event) {
  if (event.target === dialog.value) requestClose()
}

function handleCancel(event) {
  if (showDiscardConfirm.value) {
    event.preventDefault()
    showDiscardConfirm.value = false
    nextTick(() => firstField.value?.focus())
    return
  }
  event.preventDefault()
  requestClose()
}

function handleKeydown(event) {
  if (event.key !== 'Tab') return

  const scope = showDiscardConfirm.value
    ? dialog.value?.querySelector('.discard-confirm > div')
    : dialog.value
  const focusable = [...(scope?.querySelectorAll(
    'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
  ) ?? [])].filter((element) => element.tabIndex >= 0 && !element.closest('[hidden]'))
  if (!focusable.length) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function handleFiles(event) {
  fileError.value = ''
  const candidates = Array.from(event.target.files ?? [])
  let nextFiles = [...files.value]

  for (const file of candidates) {
    if (nextFiles.length >= MAX_FILES) {
      fileError.value = `最多只能添加 ${MAX_FILES} 个文件。`
      break
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      fileError.value = `${file.name} 不是支持的 JPG、PNG、WebP 或 PDF。`
      continue
    }
    if (file.size > MAX_FILE_BYTES) {
      fileError.value = `${file.name} 超过单个文件 10MB 的限制。`
      continue
    }
    if (nextFiles.reduce((sum, item) => sum + item.file.size, 0) + file.size > MAX_TOTAL_BYTES) {
      fileError.value = '全部附件合计不能超过 30MB。'
      continue
    }
    nextFiles.push({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
    })
  }

  files.value = nextFiles
  event.target.value = ''
}

function removeFile(id) {
  const target = files.value.find((item) => item.id === id)
  if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
  files.value = files.value.filter((item) => item.id !== id)
  fileError.value = ''
}

function validate() {
  Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key])
  if (!form.requestType) fieldErrors.requestType = '请选择反馈类型。'
  if (!form.relatedPage.trim()) fieldErrors.relatedPage = '请填写相关馆藏或页面。'
  if (isRemoval.value && !form.identity.trim()) fieldErrors.identity = '申请移除时，请说明身份或权利关系。'
  if (!form.contact.trim()) fieldErrors.contact = '请填写联系方式。'
  if (!form.details.trim()) fieldErrors.details = '请填写情况说明。'
  return Object.keys(fieldErrors).length === 0
}

async function submit() {
  submitNotice.value = ''
  if (!validate()) {
    await nextTick()
    dialog.value?.querySelector('[aria-invalid="true"]')?.focus()
    return
  }
  submitNotice.value = '当前版本尚未连接提交服务，你填写的内容没有发送或保存。'
}

onBeforeUnmount(() => {
  document.documentElement.classList.remove('is-drawer-open')
  revokeFiles()
})
defineExpose({ open })
</script>

<template>
  <dialog ref="dialog" class="rights-dialog feedback-drawer" aria-labelledby="rights-title" @cancel="handleCancel" @click="closeOnBackdrop" @keydown="handleKeydown">
    <div class="feedback-drawer__panel">
      <button class="icon-button feedback-drawer__close" type="button" aria-label="关闭版权反馈" @click="requestClose">
        <span aria-hidden="true">×</span>
      </button>

      <div class="feedback-drawer__scroll">
        <h2 id="rights-title">版权反馈</h2>
        <p class="feedback-drawer__intro">如需更正署名、补充来源或申请移除素材，请填写以下信息。馆主会认真核对，并按情况更正、补充或移除。</p>
        <p class="feedback-drawer__privacy">版权反馈中的身份、联系方式、情况说明和附件仅用于核对，不会公开在小草坪。</p>

        <form class="form-stack" novalidate @input="submitNotice = ''" @submit.prevent="submit">
          <fieldset class="choice-fieldset">
            <legend>反馈类型</legend>
            <label><input ref="firstField" v-model="form.requestType" type="radio" name="rights-type" value="attribution" /><span>更正署名</span></label>
            <label><input v-model="form.requestType" type="radio" name="rights-type" value="source" /><span>补充来源</span></label>
            <label><input v-model="form.requestType" type="radio" name="rights-type" value="removal" /><span>申请移除</span></label>
            <small v-if="fieldErrors.requestType" class="field-error" role="alert">{{ fieldErrors.requestType }}</small>
          </fieldset>

          <label>
            <span>相关馆藏或页面</span>
            <input v-model="form.relatedPage" type="text" maxlength="500" placeholder="粘贴页面链接，或写下馆藏名称" :aria-invalid="Boolean(fieldErrors.relatedPage)" :aria-describedby="fieldErrors.relatedPage ? 'rights-page-error' : undefined" />
            <small v-if="fieldErrors.relatedPage" id="rights-page-error" class="field-error" role="alert">{{ fieldErrors.relatedPage }}</small>
          </label>

          <label>
            <span>身份或权利关系{{ isRemoval ? '' : '（选填）' }}</span>
            <input v-model="form.identity" type="text" maxlength="100" placeholder="例如：原作者 / 授权代理人" :aria-invalid="Boolean(fieldErrors.identity)" :aria-describedby="fieldErrors.identity ? 'rights-identity-error' : undefined" />
            <small v-if="fieldErrors.identity" id="rights-identity-error" class="field-error" role="alert">{{ fieldErrors.identity }}</small>
          </label>

          <label>
            <span>联系方式</span>
            <input v-model="form.contact" type="text" maxlength="200" autocomplete="email" placeholder="邮箱或其他可联系的方式" :aria-invalid="Boolean(fieldErrors.contact)" :aria-describedby="fieldErrors.contact ? 'rights-contact-error' : undefined" />
            <small v-if="fieldErrors.contact" id="rights-contact-error" class="field-error" role="alert">{{ fieldErrors.contact }}</small>
          </label>

          <label>
            <span>情况说明</span>
            <textarea v-model="form.details" rows="6" maxlength="2000" placeholder="请说明希望更正、补充或移除的内容" :aria-invalid="Boolean(fieldErrors.details)" :aria-describedby="fieldErrors.details ? 'rights-details-error' : undefined"></textarea>
            <small class="field-counter">{{ form.details.length }} / 2000</small>
            <small v-if="fieldErrors.details" id="rights-details-error" class="field-error" role="alert">{{ fieldErrors.details }}</small>
          </label>

          <div class="file-field">
            <label for="rights-files">附件（选填）</label>
            <p>最多 5 个 JPG、PNG、WebP 或 PDF；单个不超过 10MB，合计不超过 30MB。</p>
            <input id="rights-files" ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple @change="handleFiles" />
            <small v-if="fileError" class="field-error" role="alert">{{ fileError }}</small>
            <ul v-if="files.length" class="file-preview-list" aria-label="已选附件">
              <li v-for="item in files" :key="item.id">
                <img v-if="item.previewUrl" :src="item.previewUrl" alt="" />
                <span v-else class="file-preview-list__pdf" aria-hidden="true">PDF</span>
                <span><strong>{{ item.file.name }}</strong><small>{{ formatFileSize(item.file.size) }}</small></span>
                <button type="button" :aria-label="`移除 ${item.file.name}`" @click="removeFile(item.id)">移除</button>
              </li>
            </ul>
          </div>

          <button class="button" type="submit">提交版权反馈</button>
          <p v-if="submitNotice" class="submit-notice" role="status">{{ submitNotice }}</p>
        </form>
      </div>

      <div v-if="showDiscardConfirm" class="discard-confirm" role="alertdialog" aria-modal="true" aria-labelledby="discard-title">
        <div>
          <h3 id="discard-title">要放弃尚未发送的内容吗？</h3>
          <div class="discard-confirm__actions">
            <button class="button" type="button" @click="continueEditing">继续填写</button>
            <button class="text-button" type="button" @click="finishClose">放弃并关闭</button>
          </div>
        </div>
      </div>
    </div>
  </dialog>
</template>
