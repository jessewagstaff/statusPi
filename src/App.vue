<template>
  <Date />
  <div class="twoUp">
    <Stat
      style="--primary-color: #abd1f8"
      title="Outside Temp"
      :value="weather.outside"
      :max="110"
      :min="30"
      :fixed="0"
    />
    <Stat
      class="Stat-Inside"
      title="Inside Temp"
      :value="weather.inside"
      :max="110"
      :min="30"
      :fixed="0"
    />
  </div>
  <Stat class="Stat-House" title="House Consumption (kW)" :fixed="3" :value="house.usage"  />
  <Stat class="Stat-Solar" title="Solar Production (kW)" :fixed="3" :value="house.solar" />
  <div class="twoUp">
    <Stat class="Stat-Battery" title="Battery (kW)" :fixed="1" :value="house.battery" />
    <Stat class="Stat-Battery" title="Charge (%)" :fixed="0" :max="100" :min="0" :value="house.batteryPercent" />
  </div>
  <Stat title="PG&E Grid (kW)" :fixed="3" :value="house.grid" />
  <SwellHeight v-bind="ocean" />
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

const ocean = reactive({
  swellChart: null
});

const house = reactive({
  battery: null,
  batteryPercent: null,
  grid: null,
  solar: null,
  usage: null,
});

const payloadMap = {
  'house': house,
  'nowPlaying': nowPlaying,
  'ocean': ocean,
  'weather': weather,
}

const openSocket = () => {
  const socket = new WebSocket(`ws://${location.hostname}:8081`, 'status-pi');

  socket.addEventListener('message', async ({ data }) => {
    const { type, ...payload } = JSON.parse(data);
    if (type in payloadMap) {
      Object.assign(payloadMap[type], payload);
    }
    if (type == 'refresh') {
      window.location.reload();
    }
  });

  let timeout = null;
  socket.addEventListener('close', () => {
    timeout && clearTimeout(timeout);
    timeout = setTimeout(openSocket, 5000);
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
  --primary-color: rgb(69, 144, 243);
}

.Stat-Battery {
  --primary-color: rgb(3, 156, 80);
}
</style>
