import { ref } from "vue";

const date = ref(new Date());

const interval = setInterval(() => {
  date.value = new Date();
}, 60000);

export default date;