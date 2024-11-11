import './nav'
import './MainPage.css'
import NavBar from './nav';


function App() {
  return (
    <main>
      <NavBar/>
      <div className='container'>
        <div className='infoBox'>
        <h1>RosePad</h1>
        <p>A simple and beatiful way to write notes, letters, poems and such.</p>
        <a href='https://github.com/TMG8047KG/RosePad'>Click me!</a>
      </div>
      <div className='projects'>
        <div>

        </div>
      </div>
      </div>
    </main>
  )
}

export default App;
