import React, { useState } from 'react';
import axios from 'axios';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(null);
  const [cabinetData, setCabinetData] = useState(null);

  const handleLogin = async () => {
    try {
      const response = await axios.post('http://localhost:5000/login', { username, password });
      setToken(response.data.token);
      alert('Login successful!');
    } catch (error) {
      const errorMessage = error.response ? error.response.data.message : error.message;
    alert('Login failed: ' + errorMessage);
    }
  };

  const getCabinet = async () => {
    if (!token) return alert('Please login first');
    try {
      const response = await axios.get('http://localhost:5000/cabinet', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCabinetData(response.data);
    } catch (error) {
      const errorMessage = error.response ? error.response.data.message : error.message;
    alert('Error: ' + errorMessage);
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <input type="text" placeholder="Username" onChange={e => setUsername(e.target.value)} />
      <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
      <button onClick={handleLogin}>Login</button>

      <h2>Cabinet</h2>
      <button onClick={getCabinet}>Get Cabinet Data</button>
      {cabinetData && <pre>{JSON.stringify(cabinetData, null, 2)}</pre>}
    </div>
  );
};

export default LoginForm;