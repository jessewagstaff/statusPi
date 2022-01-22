<template>
  <section>
    <header>{{ title }}</header>
    <div>{{ displayValue }}</div>
    <SparklineAreaChart
      class="Stat_Chart"
      :data="chartData"
      :height="150"
      :max="max && Math.max(max, value)"
      :min="min && Math.min(min, value)"
    />
  </section>
</template>
<script setup>
import { defineProps, computed, ref, watch } from 'vue';
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
  max: {
    type: Number,
    default: null,
  },
  min: {
    type: Number,
    default: null,
  },
});

const chartData = ref(props.value ? [props.value] : []);
let reachedLength = false;

const pushValue = (val) => {
  if (val === null) return;

  if (reachedLength) {
    chartData.value = [...chartData.value.slice(1), val];
    return;
  }

  if (chartData.value.length >= 15) {
    reachedLength = true;
  }

  chartData.value = [...chartData.value, val];
};

const displayValue = computed(() => {
  if (props.value === null) {
    return 'N/A';
  }

  if (props.fixed === 0) {
    return Math.trunc(props.value);
  }

  return parseFloat(props.value.toFixed(props.fixed));
});

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
