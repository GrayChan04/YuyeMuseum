<script setup>
import { nextTick, ref } from 'vue'

const dialog = ref(null)
const firstField = ref(null)

async function open() {
  dialog.value?.showModal()
  await nextTick()
  firstField.value?.focus()
}

function close() {
  dialog.value?.close()
}

function closeOnBackdrop(event) {
  if (event.target === dialog.value) close()
}

defineExpose({ open })
</script>

<template>
  <dialog ref="dialog" class="rights-dialog" aria-labelledby="rights-title" @click="closeOnBackdrop">
    <div class="rights-dialog__panel">
      <button class="icon-button rights-dialog__close" type="button" aria-label="关闭版权反馈" @click="close">
        <span aria-hidden="true">×</span>
      </button>

      <h2 id="rights-title">版权反馈</h2>
      <p class="rights-dialog__intro">
        我们正在准备安全的版权反馈通道。正式运营前，这里会用于提交素材更正、补充署名与删除申请。
      </p>

      <div class="notice-card notice-card--warm" role="status">
        <span class="status-dot" aria-hidden="true"></span>
        反馈通道筹备中，本版本不会发送或保存下面填写的内容。
      </div>

      <form class="form-stack" @submit.prevent>
        <label>
          <span>相关素材或页面链接</span>
          <input ref="firstField" type="url" placeholder="https://" />
        </label>
        <label>
          <span>权利人身份说明</span>
          <input type="text" placeholder="例如：原作者 / 授权代理人" />
        </label>
        <label>
          <span>联系信息</span>
          <input type="text" placeholder="邮箱或其他可联系的方式" />
        </label>
        <label>
          <span>情况说明</span>
          <textarea rows="4" placeholder="请说明希望更正、补充或移除的内容"></textarea>
        </label>
        <button class="button button--disabled" type="submit" disabled>通道筹备中</button>
      </form>
    </div>
  </dialog>
</template>
