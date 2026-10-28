import { useNavigate } from 'react-router-dom'
export function Login() {
  const navigate = useNavigate()
  return (
    <div className='h-screen w-screen flex items-center justify-center p-10'>
      <div className='flex flex-col items-center'>
        <div className='font-thin text-2xl'>Desk<span className="font-black">Report</span></div>
        <div className='mt-5 border border-neutral-800 p-6 rounded-xl'>
          <div className="xl:min-w-[320px] flex flex-col space-y-4">
            <p className="text-xl">Acesse sua conta</p>
            <label htmlFor="">
              <span className="block mb-2">Email</span>
              <input className="px-4 bg-neutral-800 w-full pt-1 pb-1.5 rounded-lg" type="text" placeholder="Seu email" />
            </label>
            <label htmlFor="">
              <span className="block mb-2">Senha</span>
              <input className="px-4 bg-neutral-800 w-full pt-1 pb-1.5 rounded-lg" type="text" placeholder="Sua senha" />
            </label>
            <a href="#">Esqueci minha senha</a>
            <button onClick={() => navigate('/')} className="bg-indigo-600 active:bg-indigo-500 pt-1 pb-1.5 rounded-lg">Entrar</button>
          </div>
        </div>
        <span className="my-3">ou</span>
        <a href='#' className="border-b border-transparent w-max text-center hover:border-neutral-700 py-1.5">Crie uma nova conta</a>
      </div>
    </div>
  )
}