<template>
  <Date />
  <div class="twoUp">
    <Stat
      style="--primary-color: #abd1f8"
      title="Outside Temp"
      :value="weather.outside"
      :fixed="0"
    />
    <Stat
      class="Stat-Inside"
      title="Inside Temp"
      :value="weather.inside"
      :fixed="0"
    />
  </div>
  <Stat class="Stat-House" title="House Usage (kWh)" />
  <Stat class="Stat-Solar" title="Solar (kWh)" />
  <Stat class="Stat-Battery" title="Battery (kWh)" />
  <Stat title="Grid (Wh)" />
  <SwellHeight />
  <NowPlaying v-bind="nowPlaying" />
</template>

<script setup>
import { reactive } from 'vue';
import Date from './components/Date.vue';
import Stat from './components/Stat.vue';
import NowPlaying from './components/NowPlaying.vue';
import SwellHeight from './components/SwellHeight.vue';

const weather = reactive({
  inside: null,
  outside: null,
});

const nowPlaying = reactive({
  playing: false,
});

const openSocket = () => {
  const socket = new WebSocket('ws://localhost:8081', 'status-pi');

  socket.addEventListener('message', async ({ data }) => {
    const { type, ...payload } = JSON.parse(data);
    if (type === 'weather') {
      Object.assign(weather, payload);
    }

    if (type == 'nowPlaying') {
      Object.assign(nowPlaying, payload);
    }

    if (type == 'refresh') {
      window.location.reload();
    }
  });

  socket.addEventListener('close', () => {
    setTimeout(openSocket, 5000);
  });
};
openSocket();
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@700&family=Roboto:wght@700&display=swap');
:root {
  --header-background-color: #171717;
  --header-text-color: #bdc1c6;
  --primary-color: #a5a5a5;
  --background-color: #212733;
}

* {
  box-sizing: border-box;
  margin: 0;
}

body {
  background-color: #000;
  color: var(--primary-color);
  max-width: 480px;
  overflow: hidden;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  text-overflow: ellipsis;
  -webkit-font-smoothing: antialiased;
}

section {
  overflow: hidden;
  background-color: var(--background-color);
  margin-bottom: 10px;
}

header {
  font-family: 'Roboto', sans-serif;
  font-size: 30px;
  text-align: left;
}

body > section:last-child {
  margin-bottom: 0;
}

img {
  max-width: 100%;
}

.twoUp {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: 10px;
}
.twoUp section {
  text-align: center;
}

/* .Stat-Outside {
  color: #ABD1F8;
} */

.Stat-Inside {
  --primary-color: #e79e7b;
}

.Stat-Solar {
  --primary-color: #d4d94a;
}

.Stat-House {
  --primary-color: rgb(64, 134, 224);
}

.Stat-Battery {
  --primary-color: rgb(0, 128, 64);
}
</style>
