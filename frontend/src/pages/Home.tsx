import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar'  // adjust path if needed
export default function Home() {
  const navigate = useNavigate();
  return (
    <>
      <Navbar />
      <div className='container-fluid home-text d-flex flex-column align-items-center'>
        <div className='text-wrap position-fixed start-0' style={{ width: 594, marginLeft: 125 }}>
          <p className='text-start title-text'>Organiza as tuas memórias com facilidade</p>
        </div>
        <div className="features-container d-flex gap-5 mt-5">
          <div className="feature">
            <svg className="text-gray-800 dark:text-white feature-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M5 7h14M5 12h14M5 17h14" />
            </svg>
            <h4 className="fw-bold mt-3">Álbuns Automáticos</h4>
            <p className="text-muted small">
              Os teus álbuns são criados automaticamente com base nas coleções que adicionas.
            </p>
          </div>

          <div className="feature">
            <svg className="w-6 h-6 text-gray-800 dark:text-white feature-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.143 4H4.857A.857.857 0 0 0 4 4.857v4.286c0 .473.384.857.857.857h4.286A.857.857 0 0 0 10 9.143V4.857A.857.857 0 0 0 9.143 4Zm10 0h-4.286a.857.857 0 0 0-.857.857v4.286c0 .473.384.857.857.857h4.286A.857.857 0 0 0 20 9.143V4.857A.857.857 0 0 0 19.143 4Zm-10 10H4.857a.857.857 0 0 0-.857.857v4.286c0 .473.384.857.857.857h4.286a.857.857 0 0 0 .857-.857v-4.286A.857.857 0 0 0 9.143 14Zm10 0h-4.286a.857.857 0 0 0-.857.857v4.286c0 .473.384.857.857.857h4.286a.857.857 0 0 0 .857-.857v-4.286a.857.857 0 0 0-.857-.857Z" />
            </svg>

            <h4 className="fw-bold mt-3">Arrastar & Largar</h4>
            <p className="text-muted small">
              Edita o teu álbum de forma simples e intuitiva. Arrasta e larga as fotos para mudar a ordem.
            </p>
          </div>
        </div>
        <button type="button" className="btn btn-primary btn-lg albumBtn rounded-pill px-4"  onClick={() => navigate("/albums")}>Crie o seu Álbum de Fotos</button>
        <div className="right-rectangle">
          <img className='img-fluid' src="/camera_polaroid-removebg-preview.png" alt="Side Decoration" />
          <div className="swipe-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="#FFFFFF" className="bi bi-arrow-down" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1" />
            </svg>
            <svg className="swipeDown" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" >
              <path d="M21 12c0 2.86-2.72 6.62-15.94 6.97-1.13.03-2.06-.88-2.06-2V7.03c0-1.13.94-2.03 2.06-2C18.28 5.38 21 9.15 21 12Z" fill="#000000"></path>
            </svg>
            <div className='divTextSwipe'>
              <p className='textSwipe'  style={{ cursor: "pointer" }} onClick={() => navigate("/albums")}>
                Desliza para Baixo para Criar
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
