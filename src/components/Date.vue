<template>
  <section>
    <div>
      {{ parts.weekday }}
      <small>{{ parts.hour }}:{{ parts.minute }}</small>
    </div>
    <div>{{ parts.month }}, {{ parts.day }}</div>
  </section>
</template>
<script setup>
import { reactive, watch } from 'vue';
import heartbeat from '../heartbeat';

const parts = reactive({
  day: '21st',
  hour: '10',
  minute: '15',
  month: 'September',
  weekday: 'Wednesday',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const formatDate = (date) => {
  dateFormatter.formatToParts(date).forEach(({ type, value }) => {
    if (parts[type]) {
      if (type === 'day') {
        value =
          value +
          ([, 'st', 'nd', 'rd'][(value / 10) % 10 ^ 1 && value % 10] || 'th');
      }

      parts[type] = value;
    }
  });
};

watch(() => heartbeat.value, formatDate);
formatDate(heartbeat.value);
</script>
<style scoped>
section {
  /* Fits longest day Wednesday September 22th */
  text-align: center;
  font-size: 60px;
  line-height: 60px;
  padding: 8px 16px 16px;
  background-color: #26312e;
  color: #bcd8c1;
}

small {
  font-family: 'Roboto Condensed', sans-serif;
  font-size: 57px;
  letter-spacing: -2px;
}
</style>
