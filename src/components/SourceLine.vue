<script setup>
defineProps({
  source: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <p class="source-line">
    <span>来源</span>
    <template v-if="source.url">
      <a :href="source.url" target="_blank" rel="noopener noreferrer">
        {{ source.platform }} · {{ source.account }}<template v-if="source.label"> · {{ source.label }}</template>
        <span aria-hidden="true">↗</span>
      </a>
    </template>
    <template v-else>
      <strong>{{ source.platform }} · {{ source.account }}<template v-if="source.label"> · {{ source.label }}</template></strong>
    </template>
  </p>
</template>
