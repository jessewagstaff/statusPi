<template>
  <section :class="{ playing: playing }">
    <img :src="image" :alt="name" />
    <header>{{ playing ? "Now Playing" : "Last Played" }}</header>
    <h1>{{ name }}</h1>
    <h2>{{ artist }}</h2>
  </section>
</template>
<script setup>
import { defineProps } from 'vue';
const props = defineProps({
  playing: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    default: 'N/A'
  },
  artist: {
    type: String,
    default: null
  },
  image: {
    type: String,
    default: null
  }
});
</script>
<style scoped>
section {
  display: grid;
  padding: 8px 0;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: auto 1fr auto;
  grid-gap: 15px;
  align-items: center;
  height: 250px;
}

.playing h1 {
  font-size: 30px;
  color: white;
}

.playing img {
  opacity: 1;
}

img {
  align-self: start;
  grid-row: 1/-1;
  opacity: 0.5;
  background: #0E0E0E;
  height: 100%;
}
</style>
