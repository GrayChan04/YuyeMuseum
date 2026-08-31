<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['message', 'opinion', 'reply'].includes(value),
  },
  replyTarget: {
    type: Object,
    default: null,
  },
  presetContent: {
    type: String,
    default: '',
  },
  presetReadonly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close'])
const drawer = ref(null)
const form = ref(null)
const fileInput = ref(null)
const isAnonymous = ref(true)
const nickname = ref('')
const content = ref(props.presetContent)
const attachments = ref([])
const rightsConfirmed = ref(false)
const errors = ref({})
const submitNotice = ref('')
const showDiscardDialog = ref(false)
const userTouched = ref(false)
const previousFocus = document.activeElement
const previousOverflow = document.body.style.overflow

const copy = computed(() => {
  if (props.mode === 'opinion') {
    return {
      title: '留下一棵意见小草',
      description: '意见始终匿名；通过审核后会公开在草坪上，馆主会逐条回复。',
      label: '你的意见',
      placeholder: '哪些地方可以做得更好？',
      submit: '确认提交意见',
    }
  }

  if (props.mode === 'reply') {
    return {
      title: '回应这棵草',
      description: '通过审核后，你的回复小草会长在这棵草旁边。',
      label: '你的回复',
      placeholder: '写下你的回应……',
      submit: '确认提交回复',
    }
  }

  return {
    title: '留下一棵小草',
    description: '可以匿名，也可以留下昵称；通过审核后，会出现在草坪上。',
    label: '留言',
    placeholder: '写下想说的话……',
    submit: '确认提交留言',
  }
})

const isDirty = computed(() => (
  attachments.value.length > 0
  || nickname.value.length > 0
  || (!props.presetReadonly && content.value.length > 0)
))

function markTouched() {
  userTouched.value = true
  submitNotice.value = ''
}

async function requestClose() {
  if (isDirty.value) {
    showDiscardDialog.value = true
    await nextTick()
    drawer.value?.querySelector('.lawn-discard-dialog button')?.focus()
  } else {
    emit('close')
  }
}

function discardAndClose() {
  showDiscardDialog.value = false
  emit('close')
}

function continueEditing() {
  showDiscardDialog.value = false
  nextTick(() => form.value?.querySelector('textarea')?.focus())
}

function revokeAttachment(attachment) {
  if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl)
}

function removeAttachment(index) {
  const [attachment] = attachments.value.splice(index, 1)
  if (attachment) revokeAttachment(attachment)
  rightsConfirmed.value = false
  markTouched()
}

function addFiles(event) {
  const selected = [...(event.target.files ?? [])]
  errors.value = { ...errors.value, attachments: '' }

  const remaining = 3 - attachments.value.length
  if (selected.length > remaining) {
    errors.value.attachments = '每次最多添加 3 张图片，请先移除多余文件。'
  }

  const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
  for (const file of selected.slice(0, remaining)) {
    const extensionOk = /\.(?:jpe?g|png|webp)$/i.test(file.name)
    if ((!acceptedTypes.has(file.type) && !(file.type === '' && extensionOk))) {
      errors.value.attachments = '只接受 JPG、PNG 或 WebP 图片。'
      continue
    }
    if (file.size > 5 * 1024 * 1024) {
      errors.value.attachments = '每张图片不能超过 5MB。'
      continue
    }

    attachments.value.push({
      file,
      previewUrl: URL.createObjectURL(file),
    })
  }

  if (fileInput.value) fileInput.value.value = ''
  if (selected.length) {
    rightsConfirmed.value = false
    markTouched()
  }
}

function validate() {
  const nextErrors = {}
  if (!content.value.trim()) nextErrors.content = `请填写${copy.value.label}。`
  if (content.value.length > 500) nextErrors.content = '内容不能超过 500 字。'
  if (props.mode !== 'opinion' && !isAnonymous.value && !nickname.value.trim()) {
    nextErrors.nickname = '请选择匿名，或留下昵称。'
  }
  if (nickname.value.length > 20) nextErrors.nickname = '昵称不能超过 20 字。'
  if (attachments.value.length && !rightsConfirmed.value) {
    nextErrors.rights = '请先确认图片分享声明。'
  }
  errors.value = nextErrors
  return Object.keys(nextErrors).length === 0
}

async function submit() {
  submitNotice.value = ''
  if (!validate()) {
    await nextTick()
    form.value?.querySelector('[aria-invalid="true"]')?.focus()
    return
  }

  submitNotice.value = '当前版本尚未连接提交服务，你填写的内容没有发送或保存。'
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    if (showDiscardDialog.value) continueEditing()
    else requestClose()
    return
  }

  if (event.key !== 'Tab') return
  const scope = showDiscardDialog.value
    ? drawer.value?.querySelector('.lawn-discard-dialog')
    : drawer.value
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

onMounted(async () => {
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', handleKeydown)
  await nextTick()
  drawer.value?.querySelector('textarea, input, button')?.focus()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = previousOverflow
  attachments.value.forEach(revokeAttachment)
  if (previousFocus instanceof HTMLElement) previousFocus.focus()
})
</script>

<template>
  <Teleport to="body">
    <div class="lawn-drawer-layer" @mousedown.self="requestClose" @click.self="requestClose">
      <aside
        ref="drawer"
        class="lawn-form-drawer"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`lawn-form-title-${mode}`"
        :aria-describedby="`lawn-form-description-${mode}`"
      >
        <header class="lawn-form-drawer__header">
          <div>
            <p>小草坪</p>
            <h2 :id="`lawn-form-title-${mode}`">{{ copy.title }}</h2>
          </div>
          <button type="button" aria-label="关闭表单" @click="requestClose">×</button>
        </header>

        <p :id="`lawn-form-description-${mode}`" class="lawn-form-drawer__description">
          {{ copy.description }}
        </p>

        <p v-if="mode === 'reply' && replyTarget" class="lawn-form-drawer__target">
          正在回应 <strong>{{ replyTarget.author || '匿名访客' }}</strong>
        </p>

        <form ref="form" class="lawn-prototype-form" novalidate @submit.prevent="submit">
          <template v-if="mode !== 'opinion'">
            <label class="lawn-check-field">
              <input v-model="isAnonymous" type="checkbox" @change="markTouched" />
              <span>匿名{{ mode === 'reply' ? '回复' : '留言' }}</span>
            </label>

            <label v-if="!isAnonymous" class="lawn-field">
              <span>昵称 <small>{{ nickname.length }}/20</small></span>
              <input
                v-model="nickname"
                type="text"
                maxlength="20"
                autocomplete="nickname"
                placeholder="想让大家怎么称呼你"
                :aria-invalid="Boolean(errors.nickname)"
                :aria-describedby="errors.nickname ? 'lawn-nickname-error' : undefined"
                @input="markTouched"
              />
              <small v-if="errors.nickname" id="lawn-nickname-error" class="lawn-field-error">{{ errors.nickname }}</small>
            </label>
          </template>

          <label class="lawn-field">
            <span>{{ copy.label }} <small>{{ content.length }}/500</small></span>
            <textarea
              v-model="content"
              rows="8"
              maxlength="500"
              :readonly="presetReadonly"
              :placeholder="copy.placeholder"
              :aria-invalid="Boolean(errors.content)"
              :aria-describedby="errors.content ? 'lawn-content-error' : undefined"
              @input="markTouched"
            ></textarea>
            <small v-if="presetReadonly" class="lawn-field-note">内容由当前页面自动带入，确认无误后即可提交。</small>
            <small v-if="errors.content" id="lawn-content-error" class="lawn-field-error">{{ errors.content }}</small>
          </label>

          <div v-if="!presetReadonly" class="lawn-attachment-field">
            <div class="lawn-attachment-field__heading">
              <div>
                <strong>附图</strong>
                <small>可选，最多 3 张；JPG、PNG、WebP，单张不超过 5MB。</small>
              </div>
              <button
                type="button"
                :disabled="attachments.length >= 3"
                @click="fileInput?.click()"
              >选择图片</button>
              <input
                ref="fileInput"
                class="visually-hidden"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                multiple
                tabindex="-1"
                :disabled="attachments.length >= 3"
                @change="addFiles"
              />
            </div>
            <small v-if="errors.attachments" class="lawn-field-error">{{ errors.attachments }}</small>

            <ul v-if="attachments.length" class="lawn-attachment-previews">
              <li v-for="(attachment, index) in attachments" :key="attachment.previewUrl">
                <img :src="attachment.previewUrl" alt="本地待提交图片预览" />
                <div>
                  <strong>{{ attachment.file.name }}</strong>
                  <small>{{ (attachment.file.size / 1024 / 1024).toFixed(2) }}MB</small>
                </div>
                <button type="button" :aria-label="`移除 ${attachment.file.name}`" @click="removeAttachment(index)">移除</button>
              </li>
            </ul>

            <label v-if="attachments.length" class="lawn-check-field lawn-rights-field">
              <input
                v-model="rightsConfirmed"
                type="checkbox"
                :aria-invalid="Boolean(errors.rights)"
                :aria-describedby="errors.rights ? 'lawn-rights-error' : undefined"
                @change="markTouched"
              />
              <span>我确认有权分享这些图片，且其中不含需要隐藏的个人信息。</span>
            </label>
            <small v-if="errors.rights" id="lawn-rights-error" class="lawn-field-error">{{ errors.rights }}</small>
          </div>

          <button class="button lawn-prototype-form__submit" type="submit">{{ copy.submit }}</button>
          <p v-if="submitNotice" class="lawn-submit-notice" role="alert">{{ submitNotice }}</p>
        </form>

        <div v-if="showDiscardDialog" class="lawn-discard-layer">
          <section class="lawn-discard-dialog" role="alertdialog" aria-modal="true" aria-labelledby="lawn-discard-title">
            <h3 id="lawn-discard-title">要放弃尚未发送的内容吗？</h3>
            <p>关闭后，本次填写与本地图片预览会被清除。</p>
            <div>
              <button class="button" type="button" @click="continueEditing">继续填写</button>
              <button class="text-button" type="button" @click="discardAndClose">放弃并关闭</button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  </Teleport>
</template>
