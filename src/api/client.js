import axios from 'axios';

export default axios.create({
  baseURL: 'https://khoipaisa.duckdns.org/spring-api',
  headers: { 'Content-Type': 'application/json' },
});
