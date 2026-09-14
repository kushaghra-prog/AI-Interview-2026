import React from 'react';
import { Routes, Route } from 'react-router-dom';
import useSocket from './hooks/useSocket';
import { ToastContainer } from 'react-toastify';
import Header from './components/Header.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import PrivateRoute from './components/privateRoute.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/profile.jsx';
import InterviewRunner from './pages/interviewRunner.jsx';
import SessionReview from './pages/SessionReview.jsx';
import NotFound from './pages/Notfound.jsx';

function App() {
  useSocket();

  return (
    <div className='min-h-screen bg-[#0f172a] text-slate-100'>
      <Header />
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route path='/' element={<PrivateRoute />}>
          <Route index element={<Dashboard />} />
          <Route path='profile' element={<Profile />} />
          <Route path='interview/:sessionId' element={<InterviewRunner />} />
          <Route path='review/:sessionId' element={<SessionReview />} />
        </Route>
        <Route path='*' element={<NotFound />} />
      </Routes>
      <ToastContainer position='top-right' autoClose={3000} theme='dark' />
    </div>
  );
}

export default App;