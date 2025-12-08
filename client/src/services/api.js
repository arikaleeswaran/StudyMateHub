// client/src/services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export const getRoadmap = async (topic) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/roadmap?topic=${topic}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching roadmap:", error);
    throw error;
  }
};