declare module 'react-wordcloud' {
  import { FC } from 'react';
  
  interface Word {
    text: string;
    value: number;
    [key: string]: any;
  }
  
  interface WordCloudProps {
    words: Word[];
    options?: any;
    callbacks?: any;
    size?: [number, number];
    [key: string]: any;
  }
  
  const ReactWordcloud: FC<WordCloudProps>;
  export default ReactWordcloud;
}
