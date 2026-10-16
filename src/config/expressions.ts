import type { ExpressionId } from '../types/index.ts';

export interface ExpressionPresentation {
  label: string;
  emoji: string;
  hint: string;
}

export const OBSERVING_MESSAGE = 'Yüz ifadenizi anlamaya çalışıyorum';

export const EXPRESSION_PRESENTATION: Record<ExpressionId, ExpressionPresentation> = {
  happy: {
    label: 'Gülümseme',
    emoji: '😊',
    hint: 'Ağız köşeleri yukarıda görünüyor.',
  },
  brow_furrow: {
    label: 'Sinirli ifade',
    emoji: '😠',
    hint: 'Kaşlar çatık ve gergin bir mimik var.',
  },
  disgust: {
    label: 'Tiksinti',
    emoji: '🤢',
    hint: 'Burun kırışmış ve üst dudak kalkık görünüyor.',
  },
  sad: {
    label: 'Üzgün ifade',
    emoji: '😢',
    hint: 'Dudak köşeleri aşağıda görünüyor.',
  },
  surprised: {
    label: 'Şaşkın ifade',
    emoji: '😮',
    hint: 'Gözler ve ağız şaşkın bir görünüm veriyor.',
  },
  neutral: {
    label: 'Sakin ifade',
    emoji: '😐',
    hint: 'Belirgin bir mimik seçilmedi.',
  },
  unknown: {
    label: 'Belirsiz',
    emoji: '🤔',
    hint: 'Biraz daha kameraya bakar mısın?',
  },
  no_face: {
    label: 'Yüz görünmüyor',
    emoji: '🫥',
    hint: 'Kameranın karşısına geç, müziğini bulalım!',
  },
};

export const DEFAULT_MESSAGES: Record<ExpressionId, string[]> = {
  happy: [
    'Erik Dalı gevrek olur, bas bas bas!',
    'Yüzün neşeyle parlıyor, bir Erik Dalı yakışır!',
    'Bu gülümsemeye coşkulu bir Erik Dalı eşlik etsin!',
  ],
  brow_furrow: [
    'Kurtlar Vadisi Cendere devrede, ortam gerildi!',
    'O kaşlar çatıldı, Cendere çalmaya başladı!',
    'Cendere müziğiyle öfkeni melodiye döküyoruz!',
  ],
  disgust: [
    'Şahdamarım çalıyor! Nane nane nane bal mısın sen!',
    'Bu tiksintiye ancak Ajdar Nane Nane yakışır!',
    'Aman aman o ne biçim mimik, Ajdar Nane devrede!',
  ],
  sad: [
    'Hüzünlü bakışlar sezildi, dertlere ortak olalım.',
    'Biraz hüzün var gibi; derin bir nefes alalım.',
    'Dudaklar büküldü, bu hüzünlü anı müzikle saralım.',
  ],
  surprised: [
    'Ooo, şaşkınlık seviyesi yükseldi!',
    'Gözler fal taşı gibi açıldı, sürpriz anı!',
    'Bu ifade tam bir sürpriz tablosu!',
  ],
  neutral: [
    'Gayet sakin ve huzurlu bir hava var.',
    'Dingin ve sakin bir moddasın; hafif bir melodi iyi gider.',
    'Belirgin bir mimik yok, sakin ritimle devam ediyoruz.',
  ],
  unknown: [
    'Biraz daha kameraya bakar mısın?',
    'İfaden netleşsin, birlikte seçelim.',
    'Işığı biraz düzeltirsen daha iyi görürüm.',
  ],
  no_face: [
    'Kameranın karşısına geç, müziğini bulalım!',
    'Yüzün kadrajda değil; bir adım yaklaş.',
    'Seni görebileceğim bir yere geç.',
  ],
};
