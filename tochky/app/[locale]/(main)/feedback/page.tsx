import { useTranslations } from 'next-intl';
import { FeedbackForm } from '@/components/FeedbackForm';

export default function FeedbackPage() {
  const t = useTranslations('Feedback');

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">{t('title')}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('description')}
        </p>
      </div>
      <FeedbackForm />
    </div>
  );
}
