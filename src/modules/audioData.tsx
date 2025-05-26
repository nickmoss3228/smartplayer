import tattoo from "../assets/tattoo.mp3"
import popular from "../assets/popular.mp3"
import {Subtitle, TimeMarker, QuizQuestion} from "../types"

export interface AudioTrack {
  id: string;
  title: string;
  audio: typeof tattoo; 
  subtitles: Subtitle[];
  timeMarkers: TimeMarker[];
  quiz: QuizQuestion[];
}

export const audioTracks: AudioTrack[] = [
  {
    id: "tattoo",
    title: "Tattoo Culture",
    audio: tattoo,
    subtitles: [
        { startTime: 0.1, endTime: 7.2, text: "The cultural status of tattooing has steadily evolved from that of an anti-social activity in the 1960s" },
        { startTime: 7.5, endTime: 12, text: "to that of a socially acceptable fashion statement today." },
        { startTime: 13, endTime: 19.5, text: "First adopted and flaunted by influential rock stars like the Rolling Stones in the early 1970s," },
        { startTime: 20, endTime: 22.8, text: "tattooing had, by the late 1980s,"},
        { startTime: 23, endTime: 27, text: "become accepted by ever-broader segments of mainstream society." },
        { startTime: 27.2, endTime:32, text: "Today, tattoos are routinely seen on rock musicians, sports stars " },
        { startTime: 32.3, endTime: 38.6, text: "and other public figures who play a significant role in setting the culture's behaviour patterns." },
        { startTime: 39.2, endTime: 45, text: "The market demographics for tattoo services are now skewed heavily toward mainstream customers. " },
        { startTime: 47, endTime: 51.5, text: "Tattooing today is the sixth fastest-growing retail business in the United States. " },
        { startTime: 52, endTime: 56.4, text: "The single fastest-growing demographic group seeking tattoo services is, " },
        { startTime: 56.7, endTime: 60, text: "to the surprise of many, middle-class suburban women." },
        { startTime: 60.6, endTime: 63.3, text: "The state and local governments of New Jersey, " },
        { startTime: 63.7, endTime: 66, text: "like those of other regions across the United States," },
        { startTime: 66.3, endTime: 69, text: "are being forced to alter their attitude and laws" },
        { startTime: 69.2, endTime: 73.8, text: "in response to the changing cultural status and popularity of tattooing " },
        { startTime: 74, endTime: 78.4, text: "and have now adopted a more open-minded approach to tattoos." },
        { startTime: 79.8, endTime: 82, text: "According to one recent journal," },
        { startTime: 82.1, endTime: 87.3, text: "tattoos were most common among motorcyclists, criminals and gang members. " },
        { startTime: 87.5, endTime: 93.4, text: "However, these stereotypical associations have changed over the past 20 years " },
        { startTime: 93.8, endTime: 99, text: "and it is estimated that almost half of the tattoos now being done are on women." },
    ],
    timeMarkers: [
        { time: 0.1, label: "1", color: "red" },
        { time: 12.8, label: "2", color: "red" },
        { time: 27.2, label: "3", color: "red" },
        { time: 39.2, label: "4", color: "red" },
        { time: 46.7, label: "5", color: "red" },
        { time: 52, label: "6", color: "red" },
        { time: 60.6, label: "7", color: "red" },
        { time: 79.8, label: "8", color: "red" },
        { time: 87.5, label: "9", color: "red" },
    ],
    quiz: [
        {
          question: "What is the current status of tattooing in society?",
          options: [
            "It remains an anti-social activity",
            "It's a socially acceptable fashion statement",
            "It's only popular among criminals",
            "It's declining in popularity"
          ],
          correctAnswer: 1,
          referenceTime: 7.5 // References the second subtitle
        },
        {
          question: "Which group is the fastest-growing demographic seeking tattoo services?",
          options: [
            "Rock musicians",
            "Sports stars",
            "Middle-class suburban women",
            "Motorcyclists"
          ],
          correctAnswer: 2,
          referenceTime: 56.7 // References the related subtitle
        },
        {
          question: "What is the current ranking of tattooing as a retail business in the United States?",
          options: [
            "The fastest-growing",
            "The third fastest-growing",
            "The sixth fastest-growing",
            "The tenth fastest-growing"
          ],
          correctAnswer: 2,
          referenceTime: 47 // References the related subtitle
        }
      ]
    },
  {
    id: "popular",
    title: "Popular",
    audio: popular,
    subtitles: [
        { startTime: 0.1, endTime: 3, text: "Would you prefer to be ‘popular’ or ‘well-liked’?" },
        { startTime: 3.6, endTime: 9, text: "A new study from The Australian National University (ANU) has shown that for Canberra's young people, " },
        { startTime: 9.4, endTime: 13, text: "being well-liked is much more desirable than being popular, " },
        { startTime: 13.2, endTime: 16.3, text: "and being popular does not always mean you’re well-liked." },
        { startTime: 17, endTime: 22.5, text: "The study by Stephanie Hawke, a PhD candidate in clinical psychology at the university, " },
        { startTime: 22.7, endTime: 27.4, text: "looked at nearly 200 Year 9 and Year 11 students from across Canberra."},
        { startTime: 28, endTime: 33.3, text: "It found that adolescents saw being popular and being well-liked as two very different things," },
        { startTime: 33.7, endTime: 38.3, text: "and that young people may not see popularity as a desirable trait." },
        { startTime: 40, endTime: 43.5, text: "The research has been released as part of National Psychology Week. " },
        { startTime: 44.2, endTime: 50, text: "It is the first Australian study to address the issue of popularity and what it means to young people. " },

        { startTime: 51, endTime: 54.2, text: "‘Both boys and girls agreed that many popular teenagers " },
        { startTime: 54.3, endTime: 57.7, text: "are disliked by the year group as a whole,’ said Ms Hawke. " },
        { startTime: 57.9, endTime: 61.3, text: "‘This can be for several reasons such as bullying, " },
        { startTime: 61.7, endTime: 65.5, text: "having an attitude of superiority and disrupting the classroom." },
        { startTime: 66, endTime: 70.5, text: "Those students who are described as being both popular and well-liked" },
        { startTime: 71, endTime: 74.6, text: "manage to balance their high social status with positive qualities " },
        { startTime: 75, endTime: 77, text: "such as being kind and friendly.’" },
        { startTime: 78.2, endTime: 81.8, text: "The study also found that there was a complicated relationship" },
        { startTime: 82, endTime: 85.2, text: "between both individual and group popularity," },
        { startTime: 85.5, endTime: 88.2, text: "and how these were perceived by students." },
        { startTime: 89, endTime: 93.8, text: "‘One interesting finding is that popular students are likely to belong to popular groups. " },
        { startTime: 94.8, endTime: 97.9, text: "This was contrasted with well-liked students," },
        { startTime: 98, endTime: 103.3, text: "who were much less likely to belong to groups of well-liked peers,’ said Ms Hawke. " },

        { startTime: 104, endTime: 108.8, text: "‘It seems that being popular is about the group that you fit into, " },
        { startTime: 109.4, endTime: 114.3, text: "whereas being well-liked is about the individual person’s inherent characteristics. " },
        { startTime: 115, endTime: 120  , text: "Almost all of the students interviewed said that they would prefer to be known" },
        { startTime: 119, endTime: 123.5, text: "as well-liked, as opposed to popular, " },
        { startTime: 124, endTime: 127, text: "because this is a reflection of who they are as a person.’" },
        { startTime: 128.3, endTime: 130.2, text: "She added that the results indicate" },
        { startTime: 130.3, endTime: 135.5, text: "that ‘popular’ students are not idealised in the way that popular culture sometimes portrays," },
        { startTime: 135.8, endTime: 142, text: "and that once other students are aware that many ‘popular’ students are not liked by others in their year group," },
        { startTime: 142.3, endTime: 147.5, text: "it is possible that they will lose the power they are perceived to have." },
    ],
    timeMarkers: [
        { time: 0.1, label: "1", color: "red" },
        { time: 3.6, label: "2", color: "red" },
        { time: 16.6, label: "3", color: "red" },
        { time: 27.5, label: "4", color: "red" },
        { time: 39, label: "5", color: "red" },
        { time: 44.2, label: "6", color: "red" },
        { time: 51, label: "7", color: "red" },
        { time: 57.7, label: "8", color: "red" },
        { time: 65.7, label: "9", color: "red" },
        { time: 78, label: "10", color: "red" },
        { time: 88.3, label: "11", color: "red" },
        { time: 94, label: "12", color: "red" },
        { time: 103.4, label: "13", color: "red" },
        { time: 114.4, label: "14", color: "red" },
        { time: 127.5, label: "15", color: "red" },
    ],
    quiz: [
        {
          question: "According to the ANU study, what did Canberra's young people prefer?",
          options: [
            "Being popular over being well-liked",
            "Being well-liked over being popular",
            "Being neither popular nor well-liked",
            "Being both popular and well-liked equally"
          ],
          correctAnswer: 1,
          referenceTime: 9.4 // "being well-liked is much more desirable than being popular"
        },
        {
          question: "What was unique about this study in the Australian context?",
          options: [
            "It focused only on Year 9 students",
            "It was conducted during Psychology Week",
            "It was the first to study popularity among young people",
            "It only studied Canberra students"
          ],
          correctAnswer: 2,
          referenceTime: 44.2 // "It is the first Australian study to address the issue of popularity"
        },
        {
          question: "Why were some popular teenagers disliked by their year group?",
          options: [
            "Because they were too studious",
            "Because they were too quiet",
            "Because of bullying, superiority attitudes, and classroom disruption",
            "Because they belonged to popular groups"
          ],
          correctAnswer: 2,
          referenceTime: 57.9 // "This can be for several reasons such as bullying..."
        },
        {
          question: "What was found about the relationship between individual popularity and group membership?",
          options: [
            "Popular students rarely belonged to groups",
            "Well-liked students usually belonged to well-liked groups",
            "Popular students were likely to belong to popular groups",
            "Group membership had no effect on popularity"
          ],
          correctAnswer: 2,
          referenceTime: 89 // "popular students are likely to belong to popular groups"
        },
        {
          question: "Why did students prefer to be known as well-liked rather than popular?",
          options: [
            "Because it made them more successful",
            "Because it reflected who they were as a person",
            "Because it gave them more friends",
            "Because teachers preferred well-liked students"
          ],
          correctAnswer: 1,
          referenceTime: 124 // "because this is a reflection of who they are as a person"
        }
      ],
  },
  
];

// Helper function to get a specific track
export const getAudioTrack = (id: string): AudioTrack | undefined => {
  return audioTracks.find(track => track.id === id);
};

// Would you prefer to be ‘popular’ or ‘well-liked’? 
// A new study from The Australian National University (ANU) has shown that for Canberra's young people, 
// being well-liked is much more desirable than being popular, 
// and being popular does not always mean you’re well-liked. 
// The study by Stephanie Hawke, a PhD candidate in clinical psychology at ANU, 
// looked at nearly 200 Year 9 and Year 11 students from across Canberra.
// It found that adolescents saw being popular and being well-liked as two very different things,
// and that young people may not see popularity as a desirable trait.

// The research has been released as part of National Psychology Week. 
// It is the first Australian study to address the issue of popularity and what it means to young people. 
// ‘Both boys and girls agreed that many popular teenagers 
// are disliked by the year group as a whole,’ said Ms Hawke. 
// ‘This can be for several reasons such as bullying, 
// having an attitude of superiority and disrupting the classroom.
// Those students who are described as being both popular and well-liked
// manage to balance their high social status with positive qualities 
// such as being kind and friendly.’

// The study also found that there was a complicated relationship
// between both individual and group popularity,

// and how these were perceived by students. 
// ‘One interesting finding is that popular students 
// are likely to belong to popular groups. 
// This was contrasted with well-liked students,
// who were much less likely to belong to groups of well-liked peers,’ said Ms Hawke. 
// ‘It seems that being popular is about the group that you fit into, 

// whereas being well-liked is about the individual person’s inherent characteristics. 
// Almost all of the students interviewed said that they would prefer
// to be known as well-liked, as opposed to popular, 
//mbecause this is a reflection of who they are as a person.’
// She added that the results indicate
// that ‘popular’ students are not idealised in the way that popular culture sometimes portrays,
// and that once other students are aware that many ‘popular’ students are not liked by others in their year group,
// it is possible that they will lose the power they are perceived to have.