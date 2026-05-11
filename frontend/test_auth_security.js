import axios from 'axios';

const testLogin = async (username, password) => {
  const API = axios.create({ baseURL: 'http://localhost:8000/api/' });
  
  try {
    console.log(`Testing login for ${username} with password: ${password}`);
    const res = await API.post('users/login/', { username, password });
    console.log("SUCCESS! Logged in as:", res.data.username);
  } catch (error) {
    console.log("FAILED. Status:", error.response ? error.response.status : error.message);
  }
};

(async () => {
  // Testing valid user with WRONG password (should fail)
  await testLogin('ali', 'wrong_pass_123');
  
  // Testing valid user with CORRECT password (should succeed)
  await testLogin('ali', 'password123');
})();
