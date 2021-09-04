import { ref } from "vue";

const date = ref(new Date());

const interval = setInterval(() => {
  date.value = new Date();
}, 20000);

export default date;