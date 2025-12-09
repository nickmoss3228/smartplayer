Всем привет!

Здесь я расскажу историю создания "The Infinity Player" и какие трудности стояли при разработке данного проекта. Поговорим про техническую, методологическую и профильную часть. 

1. Истоки. 
Все началось с идеи. Я работаю в школе английского языка, и мы заметили одну особенность: при преподавании аспектов языка, таких как грамматика, лексика, аудирование, чтение, разговорный английский и письмо - мы видим, как у студентов всегда отстаёт один аспект - аудирование. Так как практика всех остальных аспектов происходит на уроке и дома, аудирование - это самый непрактикуемый аспект английского языка. Даже если мы возьмем аудирование на уроке - чтобы понять услышанное - часто приходится переслушивать аудио по 3-4 раза, что занимает много времени, поэтому всё сводится к прослушиванию 1-2 раза. За это время, конечно, не всем удаётся понять, что было сказано или что имелось ввиду. И многие остаются недовольными - и сдаются понимать английскую речь. К тому же, многие студенты не практикуют прослушивание английского с помощью видео или аудио материалов, а искать что-то самим или смотреть фильмы на английском - нет сил или времени. 

Так и родилась идея - воплотить в реальность одну методику, которая была придумана американским учителем. Она заключается в том, чтобы у вас была возможность прослушать аудио полностью, и затем переслушивать отдельные части предложения или предложения целиком - для того, чтобы ваш мозг успел проработать информацию. Аудио можно разбить на предложения, и дать возможность студентам слушать предложения, фокусируюясь на темпе предложений и их ударении. Технически, данная идея была возможна, и я стал продумывать способы разработки и стек.

2. Начало разработки.
Я начал с размышления вариантов технологий и языков, но одно было очевидным - я знал что данный проект должен быть в ключе веб-разработки. Это будет сайт, на котором можно практиковаться, сохранять свой прогресс и пользоваться им как на компьютере - так и на телефоне. 

Конечно, выбор пал на React/TailwindCSS/Redux/ - для фронтенда, и Express.js/MongoDB - для бэкенда. React - так как у меня есть с ним опыт работы, TailwindCSS - для простой разработки как мобильного, так и десктопного вида (нативный CSS тоже хорош, просто писать на нём занимает время и силы, так как я разрабатывал данный проект один - это был отличный вариант!), Redux - стейт-менеджер который я также использовал на прошлом проекте. Это был базовый стек - но он конечно же вырос в размерах при дальнейшей разработке. 

Самым главным компонентом всего приложения является Player, о котором и пойдет речь далее. Основное время разработки было потрачено на отладку и фикс багов, связанных с этим компонентом.

3. Player. 
Начал я с того, что мне нужно было найти готовый плеер либо сделать его самостоятельно. Я попробовал сделать его сам, и у меня авышел очень примитивный варинт, который выглядел плохо и был ограничен в функционале. Поэтому, я решил найти уже готовый вариант - но с визуализацией звуковой дорожки - прямо как в Dropbox или Soundcloud. Я думаю, что данное решение помогает визуализировать предложения и видеть перед собой - сколько еще нужно прослушать или сколько уже было пройдено. Выбор пал на WaveSurfer - в нём было очень много встроенных функций по кастомизации дорожки, и его стиль можно с легкостью подстроить под себя.

WaveSurfer был лишь частью визуализации, но не всем смыслом. Мне нужно было продумать, какие функции должен нести в себе этот плеер. Заставить его включать аудио или менять аудио было тривиальной задачей, но внедрить новый функционал уже было трудным заданием. Поэтому, я решил написать псевдо-код про функционал данного проекта.

- В плеере должна быть кнопка, которая включает специальный режим работы. В нём, нам являются доступными две кнопки: одна отвечает за повторение предложения внутри определенных границ, а другая - переходит к следующей границе. Для этого, нужны функции старт\стоп, функция включения или выключения данного режима, а также функции которые отрабатывают при нажатии кнопок повтора и перехода к следующей части текста. 

- Так как две функции сильно зависят от границ, необходимо создать объект со всей информацией про аудио и включить туда Time Markers. Они идут вместе с файлом, где находится вся информация про аудио дорожки, включая субтитры и викторину. Каждое аудио я разбил на предложения - и дал им следующую структуру:

//audioData.tsx
1. id - для итерации по аудио для каждого уровня.
2. title - название трека, которые мы выводим в Плеер.
3. audio - импортированное аудио.
4. subtitles - данный объект содержит 3 пары ключ\значение, и они все помогают определить начало и конец предложения, которое мы показываем, а также текст.
5. timemarkers - объект, в котором мы указываем начало и конец предложения - что помогает нам построить функционал повторения предложений и перехода на следующее предложение.
6. quiz - набор вопросов и ответов для повторения информации в аудио.

{
    id: "1", 
    title: "Leo's Life",
    audio: Leoslife,
    subtitles: [
      { startTime: 0.1, endTime: 1, text: "Meet Leo." },
      { startTime: 1.3, endTime: 3.3, text: "Leo is a happy young man." },
      { startTime: 4, endTime: 5.5, text: "He is 26 years old." },
      {
        startTime: 6.2,
        endTime: 9,
        text: "He lives in a small flat with his cat, Ginger.",
      },
      { startTime: 9.8, endTime: 11.2, text: "He works at a local shop." },
      {
        startTime: 11.8,
        endTime: 15.5,
        text: "He loves his job because he meets many friendly people every day.",
      },
      {
        startTime: 16.2,
        endTime: 24.5,
        text: "Leo enjoys simple things, like walking in the park, listening to music, and drinking warm tea in the evening. ",
      },
      {
        startTime: 25.2,
        endTime: 29,
        text: "He always has a smile on his face and likes to help others.",
      },
      { startTime: 29.6, endTime: 32, text: "People say Leo is very kind." },
      {
        startTime: 32.6,
        endTime: 36,
        text: "He has a lot of friends and he sees them every weekend.",
      },
      {
        startTime: 36.7,
        endTime: 41.5,
        text: "The story of Leo starts in a small town named Neverland, ",
      },
      {
        startTime: 41.8,
        endTime: 45.7,
        text: "where he was born and lives today.",
      },
      { startTime: 46, endTime: 48, text: "And here is his story…" },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 1.5, label: "2", color: "red" },
      { time: 4, label: "3", color: "red" },
      { time: 6.1, label: "4", color: "red" },
      { time: 9.7, label: "5", color: "red" },
      { time: 11.8, label: "6", color: "red" },
      { time: 16, label: "7", color: "red" },
      { time: 24.8, label: "8", color: "red" },
      { time: 29.4, label: "9", color: "red" },
      { time: 32.5, label: "10", color: "red" },
      { time: 36.6, label: "11", color: "red" },
      { time: 45.8, label: "12", color: "red" },
    ],
    quiz: [
      {
        question: "How old is Leo?",
        options: [
          "25 years old",
          "28 years old",
          "26 years old",
          "24 years old",
        ],
        correctAnswer: 2,
        referenceTime: 4,
      },
      {
        question: "What is the name of Leo's cat?",
        options: ["Ginger", "Tiger", "Fluffy", "Shadow"],
        correctAnswer: 0,
        referenceTime: 6.2,
      },
      {
        question: "Where does Leo work?",
        options: [
          "At a bank",
          "At a school",
          "At a restaurant",
          "At a local shop",
        ],
        correctAnswer: 3,
        referenceTime: 9.8,
      },
      {
        question: "What is the name of the town where Leo lives?",
        options: ["Wonderland", "Dreamland", "Neverland", "Fairyland"],
        correctAnswer: 2,
        referenceTime: 36.7,
      },
      {
        question: "What does Leo enjoy doing in his free time?",
        options: [
          "Reading books",
          "Walking in the park and listening to music",
          "Playing video games",
          "Watching movies",
        ],
        correctAnswer: 1,
        referenceTime: 16.2,
      },
    ],
  },

А вот функция, отвечающая за рендер данных маркеров:

- const renderTimeMarkers = useCallback(() => {
      if (durationSeconds === 0) return null;

      return (
        <div className="absolute top-0 left-0 right-0 h-full bottom-0">
          {timeMarkers.map((marker, index) => {
            const position = (marker.time / durationSeconds) * 100;

            return (
              <div
                key={index}
                className="absolute top-0 bottom-0 w-0.5 md:w-[2px] cursor-pointer transition-opacity duration-300 z-10 hover:opacity-80"
                style={{
                  left: `${position}%`,
                  backgroundColor: marker.color || "red",
                }}
                onClick={() => handleMarkerClick(marker.time)}
                title={`Jump to ${marker.label}`}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-black/75 text-white px-1.5 py-0.5 md:px-[6px] md:py-0.5 rounded text-[11px] md:text-[11px] whitespace-nowrap">
                  {marker.label}
                </span>
              </div>
            );
          })}
        </div>
      );
    }, [durationSeconds, timeMarkers, handleMarkerClick]);

Также, вот функция отвечающая за нажатие на маркер:

const handleMarkerClick = useCallback(
      async (time: number) => {
        if (!wavesurfer.current) return;

        try {
          // In sentence mode we upadte currentMarkerIndex
          if (isPlayMode) {
            const markerIndex = timeMarkers.findIndex((marker, index) => {
              const markerTime =
                typeof marker === "object" ? marker.time : marker;
              const nextMarker = timeMarkers[index + 1];
              const nextTime = nextMarker
                ? typeof nextMarker === "object"
                  ? nextMarker.time
                  : nextMarker
                : durationSeconds;

              return time >= markerTime && time < nextTime;
            });

            if (markerIndex >= 0) {
              dispatch(setCurrentMarkerIndex(markerIndex));
            }
          }

          wavesurfer.current.seekTo(time / durationSeconds);
          await new Promise((resolve) => setTimeout(resolve, 50));
          await wavesurfer.current.play();
          dispatch(setIsPlaying(true));
        } catch (error) {
          console.error("Error in handleMarkerClick:", error);
          dispatch(setIsPlaying(false));
        }
      },
      [durationSeconds, dispatch, isPlayMode, timeMarkers]
    );