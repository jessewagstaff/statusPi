<template>
  <section :style="`--img: url('http://cdip.ucsd.edu/recent/model_images/sf.png?t=${lastDate.getTime()}')`">
    <header>Swell Height</header>
  </section>
</template>
<script setup>
import {ref, watch } from 'vue';
import heartbeat from '../heartbeat';

const lastDate = ref(heartbeat.value);

watch(() => heartbeat.value, (current) => {
  if (current - lastDate.value >= 3600000) {
    lastDate.value = current;
  }
})

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