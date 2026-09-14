import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'

const PrivateRoute = () => {
  const { user, isLoading } = useSelector((state) => state.auth)

  if (isLoading) {
    return (
      <div className='flex justify-center items-center min-h-[80vh]'>
        <div className='spinner'></div>
      </div>
    )
  }

  return user ? <Outlet /> : <Navigate to='/login' />
}

export default PrivateRoute
