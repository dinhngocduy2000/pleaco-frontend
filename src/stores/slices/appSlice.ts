import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface AppState {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
}

const initialState: AppState = {
  theme: 'light',
  sidebarOpen: false,
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
  },
})

export const { setTheme, toggleSidebar } = appSlice.actions
export default appSlice.reducer
