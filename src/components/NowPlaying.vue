<template>
  <section :class="{ playing: playing }">
    <img :src="image" :alt="name" />
    <header>{{ playing ? 'Now Playing' : 'Last Played' }}</header>
    <main>
      <h1>{{ name }}</h1>
      {{ artist }}
    </main>
  </section>
</template>
<script setup>
import { defineProps } from 'vue';
const props = defineProps({
  playing: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
    default: 'N/A',
  },
  artist: {
    type: String,
    default: null,
  },
  image: {
    type: String,
    default: null,
  },
});
</script>
<style scoped>
section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: auto 1fr;
  grid-gap: 15px;
  height: 250px;
  overflow: hidden;
  font-family: 'Roboto Condensed', sans-serif;
  font-size: 28px;
  line-height: 28px;
}

header {
  margin-top: 8px;
}

h1 {
  font-size: 35px;
  line-height: 33px;
  margin-bottom: 10px;
}

.playing h1 {
  color: white;
}

img {
  align-self: start;
  grid-row: 1/-1;
  background: #0e0e0e;
  height: 100%;
}
</style>
