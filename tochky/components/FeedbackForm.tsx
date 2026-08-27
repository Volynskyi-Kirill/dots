import { STORAGE_KEYS } from "@/lib/constants";
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { submitFeedback } from '@/actions/feedback';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CheckCircle2 } from 'lucide-react';

export function FeedbackForm() {
  const t = useTranslations('Feedback');
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [techInfo, setTechInfo] = useState({
    sessionId: '',
    userAgent: '',
    screenResolution: '',
  });

  useEffect(() => {
    setTechInfo({
      sessionId: localStorage.getItem(STORAGE_KEYS.SESSION_ID) || 'Not found',
      userAgent: navigator.userAgent,
      screenResolution: `${window.innerWidth}x${window.innerHeight}`,
    });
  }, []);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    formData.append('sessionId', techInfo.sessionId);
    formData.append('userAgent', techInfo.userAgent);
    formData.append('screenResolution', techInfo.screenResolution);

    startTransition(async () => {
      const res = await submitFeedback(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setIsSuccess(true);
      }
    });
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-green-600 space-y-4">
        <CheckCircle2 className="h-16 w-16" />
        <p className="font-medium text-xl">{t('success')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8 max-w-lg mx-auto bg-card p-6 rounded-xl border shadow-sm">
      <div className="space-y-3">
        <Label className="text-base font-semibold">{t('question')}</Label>
        <RadioGroup defaultValue="bug" name="type" className="flex flex-col space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="bug" id="r1" />
            <Label htmlFor="r1" className="font-normal">{t('typeBug')}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="idea" id="r2" />
            <Label htmlFor="r2" className="font-normal">{t('typeIdea')}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="review" id="r3" />
            <Label htmlFor="r3" className="font-normal">{t('typeReview')}</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label htmlFor="message" className="text-base font-semibold">{t('messageLabel')}</Label>
        <Textarea
          id="message"
          name="message"
          placeholder={t('messagePlaceholder')}
          className="resize-none min-h-[120px]"
          required
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="contact" className="text-base font-semibold">{t('contactLabel')}</Label>
        <Input
          id="contact"
          name="contact"
          placeholder={t('contactPlaceholder')}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t('submitting')}
          </>
        ) : (
          t('submit')
        )}
      </Button>
    </form>
  );
}
