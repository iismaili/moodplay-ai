interface WelcomeScreenProps {
  stopped: boolean;
  onStart: () => void;
}

export function WelcomeScreen({ stopped, onStart }: WelcomeScreenProps) {
  return (
    <section
      className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-3xl flex-col justify-center px-4 py-10"
      data-testid="welcome-screen"
    >
      <p className="text-sm font-semibold tracking-[0.2em] text-sky-300 uppercase">MoodPlay AI</p>
      <h1 className="mt-3 text-4xl font-semibold text-balance text-white sm:text-6xl">
        Yüz ifaden müziğini seçsin
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-slate-200 sm:text-2xl">
        Kamera, görünür mimik ipuçlarına bakıp sana eğlenceli bir Türkçe mesaj ve uygun bir parça seçer.
      </p>
      <div className="mt-8 grid gap-3 text-base text-slate-100 sm:text-lg">
        <p className="rounded-2xl border border-white/10 bg-white/5 p-4">
          Kamera ancak <strong>Deneyimi Başlat</strong> düğmesine basınca açılır. Görüntü kaydedilmez ve
          sunucuya gönderilmez.
        </p>
        <p className="rounded-2xl border border-white/10 bg-white/5 p-4">
          Bu bir duygu teşhisi değildir. Uygulama yalnızca gülümseme, kaş çatma, şaşkın ifade ve sakin
          görünüm gibi görünen ipuçlarını kullanır.
        </p>
        <p className="rounded-2xl border border-white/10 bg-white/5 p-4">
          Müzik, düğmeye bastıktan sonra tarayıcının ses izniyle çalar. Ses açılmazsa oynat düğmesini kullan.
        </p>
      </div>
      {stopped ? (
        <p className="mt-6 text-sky-200" role="status">
          Deneyim durduruldu. Kamera kapatıldı.
        </p>
      ) : null}
      <button
        className="mt-8 min-h-14 rounded-full bg-gradient-to-r from-violet-500 to-sky-500 px-8 text-lg font-semibold text-white shadow-lg shadow-violet-950/40"
        data-testid="start-button"
        onClick={onStart}
        type="button"
      >
        Deneyimi Başlat
      </button>
    </section>
  );
}
