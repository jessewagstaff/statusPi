<template>
  <section :style="swellChart && `--img: url('${swellChart}')`">
    <header>Swell Height</header>
  </section>
</template>
<script setup>
import { defineProps } from 'vue';
const props = defineProps({
  swellChart: {
    type: String,
    default: null,
  }
});
</script>
<style scoped>
section {
  background-image: var(--img);
  height: 500px;
  background-size: 140%;
  background-position: -118px -263px;
  opacity: 0.7;
}

header {
  display: inline;
  padding: 8px;
  background: rgba(19, 19, 19, 0.479);
  color: #fff;
}
</style>
