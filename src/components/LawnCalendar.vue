<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  dateKeys: {
    type: Array,
    default: () => [],
  },
  selectedKey: {
    type: String,
    default: '',
  },
  todayKey: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['select'])

const initialMonth = (props.selectedKey || props.dateKeys[0] || props.todayKey).slice(0, 7)
const visibleMonth = ref(initialMonth)

const monthParts = computed(() => {
  const [year, month] = visibleMonth.value.split('-').map(Number)
  return { year, month }
})

const availableYears = computed(() => {
  const years = new Set([
    Number(props.todayKey.slice(0, 4)),
    monthParts.value.year,
  ])
  props.dateKeys.forEach((key) => years.add(Number(key.slice(0, 4))))
  return [...years].filter(Number.isFinite).sort((a, b) => b - a)
})

const availableMonths = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: `${index + 1}月`,
}))

const markedDates = computed(() => new Set(props.dateKeys))

const calendarCells = computed(() => {
  const { year, month } = monthParts.value
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells = Array.from({ length: firstWeekday }, (_, index) => ({ blank: true, id: `blank-${index}` }))

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({
      id: key,
      key,
      day,
      marked: markedDates.value.has(key),
      selected: props.selectedKey === key,
      today: props.todayKey === key,
    })
  }

  return cells
})

function setVisibleMonth(year, month) {
  const normalized = new Date(Date.UTC(year, month - 1, 1))
  visibleMonth.value = `${normalized.getUTCFullYear()}-${String(normalized.getUTCMonth() + 1).padStart(2, '0')}`
}

function moveMonth(offset) {
  const { year, month } = monthParts.value
  setVisibleMonth(year, month + offset)
}

function selectYear(event) {
  setVisibleMonth(Number(event.target.value), monthParts.value.month)
}

function selectMonth(event) {
  setVisibleMonth(monthParts.value.year, Number(event.target.value))
}

function selectDate(cell) {
  if (cell.marked) emit('select', cell.key)
}

watch(
  () => props.selectedKey,
  (key) => {
    if (key) visibleMonth.value = key.slice(0, 7)
  },
)
</script>

<template>
  <section class="lawn-calendar" aria-labelledby="lawn-calendar-title">
    <header class="lawn-calendar__heading">
      <div>
        <p class="lawn-calendar__eyebrow">寻找一块草地</p>
        <h2 id="lawn-calendar-title">按日期寻找</h2>
      </div>
      <span>{{ dateKeys.length }} 天</span>
    </header>

    <div class="lawn-calendar__selectors">
      <label>
        <span class="visually-hidden">年份</span>
        <select :value="monthParts.year" aria-label="选择年份" @change="selectYear">
          <option v-for="year in availableYears" :key="year" :value="year">{{ year }}年</option>
        </select>
      </label>
      <label>
        <span class="visually-hidden">月份</span>
        <select :value="monthParts.month" aria-label="选择月份" @change="selectMonth">
          <option v-for="month in availableMonths" :key="month.value" :value="month.value">
            {{ month.label }}
          </option>
        </select>
      </label>
      <button type="button" aria-label="上个月" @click="moveMonth(-1)">←</button>
      <button type="button" aria-label="下个月" @click="moveMonth(1)">→</button>
    </div>

    <div class="lawn-calendar__weekdays" aria-hidden="true">
      <span v-for="weekday in ['日', '一', '二', '三', '四', '五', '六']" :key="weekday">{{ weekday }}</span>
    </div>
    <div class="lawn-calendar__grid">
      <template v-for="cell in calendarCells" :key="cell.id">
        <span v-if="cell.blank" class="lawn-calendar__blank" aria-hidden="true"></span>
        <button
          v-else
          type="button"
          :class="{
            'is-marked': cell.marked,
            'is-selected': cell.selected,
            'is-today': cell.today,
          }"
          :disabled="!cell.marked"
          :aria-label="`${cell.key}${cell.marked ? '，有公开内容' : '，没有公开内容'}`"
          :aria-pressed="cell.selected || undefined"
          @click="selectDate(cell)"
        >
          {{ cell.day }}
        </button>
      </template>
    </div>
    <p class="lawn-calendar__hint">有小草的日期会被标记。较早的内容也会一直留在这里。</p>
  </section>
</template>
