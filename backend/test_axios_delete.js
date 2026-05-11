import axios from 'axios';

const testDelete = async () => {
  const API = axios.create({
    baseURL: 'http://localhost:8000/api/',
  });
  
  try {
    console.log("Attempting to delete ID 6...");
    const res = await API.delete('catalog/6/');
    console.log("Success! Status:", res.status);
  } catch (error) {
    console.error("Error! Message:", error.message);
    if (error.response) {
      console.error("Response Data:", error.response.data);
      console.error("Response Status:", error.response.status);
    }
  }
};

testDelete();
