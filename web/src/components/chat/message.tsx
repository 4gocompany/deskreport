import { useEffect } from 'react';

export function Message() {
  useEffect(() => {
    if (window !== undefined) {
      const chatMessages = document.querySelectorAll('.message');
      chatMessages.forEach((chatMessage, key) => {
        if (key + 1 === chatMessages.length) {
          chatMessage.scrollIntoView({
            behavior: 'smooth',
          });
        }
      });

      // if (chatMessages.) chatWindow.scrollTo(0, chatWindow.scrollHeight)
    }
  }, []);

  return (
    <div className='flex flex-col justify-center w-full mt-4 group message odd:items-end'>
      <div
        className={`group-odd:bg-indigo-600 group-odd:rounded-b-2xl group-odd:rounded-tl-2xl bg-neutral-800 rounded-b-2xl group-even:rounded-tr-2xl flex flex-col px-6 pt-5 pb-6 w-max max-w-[35rem] border border-neutral-800/50 group`}
      >
        <p>
          Lorem Ipsum dolor sit amet, jet amet Lorem Ipsum dolor sit amet, jet amet Lorem Ipsum dolor sit amet, jet amet Lorem Ipsum dolor sit amet, jet amet
          Lorem Ipsum dolor sit amet, jet amet
        </p>
      </div>
      <span className='block py-2 mx-6 text-sm opacity-50'>01/02/2024 20:00</span>
    </div>
  );
}
