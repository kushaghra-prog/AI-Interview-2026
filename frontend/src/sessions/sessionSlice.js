import axios from 'axios';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = `${import.meta.env.VITE_API_URL}/sessions/`;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((request) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user && user.token) {
    request.headers.Authorization = `Bearer ${user.token}`;
  }
  return request;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const initialState = {
  session: [],
  activeSession: null,
  isError: false,
  isLoading: false,
  message: '',
};

export const getSessions = createAsyncThunk('sessions/getSessions', async (_, thunkAPI) => {
  try {
    const response = await api.get('/');
    return response.data;
  } catch (error) {
    const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const createSession = createAsyncThunk('sessions/createSession', async (sessionData, thunkAPI) => {
  try {
    const response = await api.post('/', sessionData);
    return response.data;
  } catch (error) {
    const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const getSessionById = createAsyncThunk('sessions/getSessionById', async (sessionId, thunkAPI) => {
  try {
    const response = await api.get(`/${sessionId}`);
    return response.data;
  } catch (error) {
    const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const deleteSession = createAsyncThunk('sessions/deleteSession', async (sessionId, thunkAPI) => {
  try {
    await api.delete(`/${sessionId}`);
    return sessionId;
  } catch (error) {
    const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const submitAnswer = createAsyncThunk('sessions/submitAnswer', async ({ sessionId, formData }, thunkAPI) => {
  try {
    const response = await api.post(`/${sessionId}/submit-answer`, formData, {
      headers: formData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return response.data;
  } catch (error) {
    const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const endSession = createAsyncThunk('sessions/endSession', async (sessionId, thunkAPI) => {
  try {
    const response = await api.post(`/${sessionId}/end-session`);
    return response.data;
  } catch (error) {
    const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const sessionSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    reset: (state) => ({ ...initialState, session: state.session }),
    socketUpdateSession: (state, action) => {
      const { sessionId, status, message, sessionData } = action.payload || {};
      state.message = message || '';

      if (sessionData && state.activeSession && state.activeSession._id === sessionId) {
        state.activeSession = sessionData;
      } else if (sessionId && state.activeSession && state.activeSession._id === sessionId) {
        state.activeSession.status = status;
      }

      const index = state.session.findIndex((session) => session._id === sessionId);
      if (index !== -1) {
        state.session[index] = { ...state.session[index], ...sessionData, status };
      }
    },
    setActiveSession: (state, action) => {
      state.activeSession = action.payload;
    }

  },
  extraReducers: (builder) => {
    builder
      .addCase(getSessions.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(getSessions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.session = action.payload;
      })
      .addCase(getSessions.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload || action.error.message;
      })
      .addCase(createSession.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(createSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.message=action.payload.message;
      })
      .addCase(createSession.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload || action.error.message;
      })
      .addCase(getSessionById.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(getSessionById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.activeSession = action.payload;
      })
      .addCase(getSessionById.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload || action.error.message;
      })
      .addCase(deleteSession.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(deleteSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.session = state.session.filter((item) => item._id !== action.payload);
      })
      .addCase(deleteSession.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload || action.error.message;
      })
      .addCase(submitAnswer.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(submitAnswer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.message = action.payload?.message || 'Answer submitted successfully';
      })
      .addCase(submitAnswer.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload || action.error.message;
      })
      .addCase(endSession.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(endSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.message = action.payload?.message || 'Session ended';
      })
      .addCase(endSession.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload || action.error.message;
      });
  },
});

export const {reset,socketUpdateSession, setActiveSession } = sessionSlice.actions;
export default sessionSlice.reducer;
