<template>
  <svg :width="width" :height="height">
    <g>
      <path class="fill" :d="closePolyPoints" />
      <path :d="linePoints" />
    </g>
  </svg>
</template>
<script setup>
import { defineProps, computed } from "vue";

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  max: {
    type: Number,
    default: null,
  },
  min: {
    type: Number,
    default: null,
  },
  height: {
    type: Number,
    default: 200,
  },
});

const width = 480;
const divisor = 0.5;

const points = computed(() => {
  const len = props.data.length;

  const maxY = props.max === null ? Math.max(...props.data) : props.max;
  const minY = props.min === null ? Math.min(...props.data) : props.min;

  const hfactor = width / (len - (len > 1 ? 1 : 0));
  const vfactor = props.height / (maxY - minY || 2);

  return props.data.map((val, index) => ({
    x: index * hfactor,
    y: (maxY === minY ? 1 : maxY - val) * vfactor,
  }));
});

const linePoints = computed(() =>
  points.value.reduce((acc, { x, y }, index, arr) => {
    if (index == 0) return `M${x} ${y}`;
    const { x: prevX, y: prevY } = arr[index - 1];
    const len = (x - prevX) * divisor;
    return `${acc} C ${prevX + len} ${prevY} ${x - len} ${y} ${x} ${y}`;
  }, "")
);

const closePolyPoints = computed(() => {
  return linePoints.value && `${linePoints.value} L${points.value[points.value.length - 1].x} ${
    props.height
  } 0 ${props.height} 0 ${points.value[0].y}`;
});
</script>
<style scoped>
path {
  stroke: var(--primary-color);
  stroke-width: 4;
  stroke-linejoin: round;
  stroke-linecap: round;
  fill: none;
}

path.fill {
  fill: var(--primary-color);
  stroke-width: 0;
  opacity: 0.3;
}
</style>
