<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { isSafeHttpUrl, publicAsset } from '../utils/format'

const props = defineProps({
  source: {
    type: Object,
    required: true,
  },
  keywordId: {
    type: String,
    default: '',
  },
  nodeId: {
    type: String,
    default: '',
  },
  sourceId: {
    type: String,
    default: '',
  },
})

const router = useRouter()
const resolvedSourceId = computed(() => props.sourceId || props.source.id || '')
const sourceExists = computed(() => {
  if (typeof props.source.isexist === 'boolean') return props.source.isexist
  if (props.source.isexist === 'true') return true
  if (props.source.isexist === 'false') return false
  return props.source.status !== 'unavailable'
})
const isUnavailable = computed(() => !sourceExists.value || props.source.status === 'unavailable')
const activeUrl = computed(() =>
  !isUnavailable.value && isSafeHttpUrl(props.source.url) ? props.source.url.trim() : '',
)
const archiveHref = computed(() => {
  if (isSafeHttpUrl(props.source.archiveUrl)) return props.source.archiveUrl.trim()
  if (props.source.screenshotSrc) return props.source.screenshotSrc
  if (props.source.archiveAsset) return publicAsset(props.source.archiveAsset)
  if (props.source.screenshotpath) return publicAsset(props.source.screenshotpath)
  return ''
})
const archiveText = computed(() => {
  if (props.source.archiveLabel) return props.source.archiveLabel
  if (props.source.archiveUrl) return '查看网页存档'
  return '查看馆内截图'
})
const sourceDescription = computed(() =>
  [props.source.platform, props.source.account, props.source.label].filter(Boolean).join(' · ')
    || props.source.description
    || '原平台出处',
)
const canReport = computed(() =>
  Boolean(props.keywordId && props.nodeId && resolvedSourceId.value),
)

function reportBrokenSource() {
  if (!canReport.value) return

  router.push({
    name: 'lawn',
    query: {
      intent: 'source-feedback',
      keywordId: props.keywordId,
      nodeId: props.nodeId,
      sourceId: resolvedSourceId.value,
    },
  })
}
</script>

<template>
  <div class="source-line" :class="{ 'source-line--unavailable': isUnavailable }">
    <div class="source-line__reference">
      <span class="source-line__label">来源</span>
      <a
        v-if="activeUrl"
        :href="activeUrl"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`${sourceDescription}（将在新窗口打开）`"
      >
        {{ sourceDescription }}
        <span aria-hidden="true">↗</span>
      </a>
      <strong v-else>{{ sourceDescription || '出处待考' }}</strong>

      <span v-if="isUnavailable" class="source-line__status">{{ source.status === 'missing' ? '凭证缺失' : '原链接已失效' }}</span>
      <a
        v-if="isUnavailable && archiveHref"
        class="source-line__archive"
        :href="archiveHref"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`${archiveText}（将在新窗口打开）`"
      >
        {{ archiveText }}
        <span aria-hidden="true">↗</span>
      </a>
    </div>

    <button
      v-if="canReport"
      class="source-line__feedback"
      type="button"
      :aria-label="`报告来源链接失效：${sourceDescription}`"
      @click="reportBrokenSource"
    >
      链接失效？告诉馆主
    </button>
  </div>
</template>
