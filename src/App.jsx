import {Routes,Route,Navigate} from 'react-router-dom'
import Layout from './components/Layout.jsx'
import {RequireAuth,GuestOnly} from './auth.jsx'
import Gateway from './pages/Gateway.jsx'
import Feed from './pages/Feed.jsx'
import Discover from './pages/Discover.jsx'
import Partners from './pages/Partners.jsx'
import Profile from './pages/Profile.jsx'
import Messages from './pages/Messages.jsx'
import Events from './pages/Events.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
export default function App(){
  const guard=el=><RequireAuth>{el}</RequireAuth>
  return <Routes><Route element={<Layout/>}>
    <Route index element={<Gateway/>}/>
    <Route path="login" element={<GuestOnly><Login/></GuestOnly>}/>
    <Route path="signup" element={<GuestOnly><Signup/></GuestOnly>}/>
    <Route path="feed" element={guard(<Feed/>)}/>
    <Route path="discover" element={guard(<Discover/>)}/>
    <Route path="partners" element={guard(<Partners/>)}/>
    <Route path="u/:uid" element={guard(<Profile/>)}/>
    <Route path="messages" element={guard(<Messages/>)}/>
    <Route path="dashboard" element={<Navigate to="/feed" replace/>}/>
    <Route path="directory" element={<Navigate to="/discover" replace/>}/>
    <Route path="events" element={guard(<Events/>)}/>
    <Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes>
}
