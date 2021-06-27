<template>
  <section>
    <header>{{ title }}</header>
    <div>{{ value === null ? 'N/A' : value.toFixed(fixed) }}</div>
    <SparklineAreaChart
      v-if="chartData.length > 1"
      class="Stat_Chart"
      :data="chartData"
      :height="150"
      :max="max"
      :min="min"
    />
  </section>
</template>
<script setup>
import { defineProps, ref, watch } from 'vue';
import SparklineAreaChart from './SparklineAreaChart.vue';

const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  value: {
    type: Number,
    default: null,
  },
  fixed: {
    type: Number,
    default: 2,
  },
});

const chartData = ref(props.value ? [props.value] : [0, 100, 0]);
const max = ref(null);
const min = ref(null);
let lastUpdate = null;
let reachedLength = false;
let minMaxDay = null;

const pushValue = (val, lastVal = 0) => {
  if (val === null) return;

  if (lastVal === null) {
    chartData.value = [val];
    return;
  }

  lastUpdate = new Date();

  const today = lastUpdate.getDay();
  if (minMaxDay !== today) {
    minMaxDay = today;
    max.value = val;
    min.value = val;
  }

  max.value = Math.max(max.value, val);
  min.value = Math.min(min.value, val);

  if (reachedLength) {
    chartData.value = [...chartData.value.slice(1), val];
    return;
  }

  if (chartData.value.length >= 10) {
    reachedLength = true;
  }

  chartData.value = [...chartData.value, val];
};

watch(() => props.value, pushValue);
</script>
<style scoped>
section {
  color: var(--primary-color);
  font-size: 120px;
  padding: 8px;
  text-align: right;
  font-family: 'Roboto Condensed', sans-serif;
  white-space: nowrap;
  position: relative;
}
header {
  font-family: 'Roboto', sans-serif;
  font-size: 30px;
  text-align: left;
  padding: 0;
}

div {
  position: relative;
  z-index: 2;
  -webkit-text-stroke-color: var(--background-color);
  -webkit-text-stroke-width: 4px;
  opacity: 0.9;
}

.Stat_Chart {
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 1;
}
</style>
