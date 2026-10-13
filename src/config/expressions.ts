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
    label: 'Kaş çatma',
    emoji: '🤨',
    hint: 'Kaşlar aşağı doğru görünüyor. Bu bir duygu teşhisi değildir.',
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
    'Bu gülümsemeye bir oyun havası yakışır!',
    'Yüzün neşeyle parlıyor, ritim de ona eşlik etsin.',
    'Bu gülümseme sahneyi aydınlattı!',
  ],
  brow_furrow: [
    'Kızma biraz! Haydi neşemizi yükseltelim.',
    'Kaşlarını çatmış gibisin; bir kahkaha payı ayıralım.',
    'O kaşlar insin, tempo yükselsin!',
  ],
  surprised: [
    'Ooo, şaşkınlık seviyesi yükseldi!',
    'Gözlerin açıldı, sürpriz müziği devrede!',
    'Bu ifade tam bir sürpriz anı.',
  ],
  neutral: [
    'Biraz enerji katalım mı?',
    'Sakin bir ifade; hafif bir ritimle açılalım.',
    'Belirgin bir mimik yok, küçük bir hareket katalım.',
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
