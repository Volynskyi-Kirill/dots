'use client';

import { useState, useTransition, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { submitFeedback } from '@/actions/feedback';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MessageSquarePlus, Loader2, CheckCircle2 } from 'lucide-react';

export function FeedbackDialog() {
  const t = useTranslations('Feedback');
  const [isOpen, setIsOpen] = useState(false);
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
      sessionId: localStorage.getItem('sessionId') || 'Not found',
      userAgent: navigator.userAgent,
      screenResolution: `${window.innerWidth}x${window.innerHeight}`,
    });
  }, [isOpen]);

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
        setTimeout(() => {
          setIsOpen(false);
          setIsSuccess(false);
        }, 2000);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg"
          title={t('trigger')}
        >
          <MessageSquarePlus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-green-600 space-y-4">
            <CheckCircle2 className="h-12 w-12" />
            <p className="font-medium">{t('success')}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6 pt-4">
            <div className="space-y-3">
              <Label>{t('question')}</Label>
              <RadioGroup defaultValue="bug" name="type" className="flex flex-col space-y-1">
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

            <div className="space-y-2">
              <Label htmlFor="message">{t('messageLabel')}</Label>
              <Textarea
                id="message"
                name="message"
                placeholder={t('messagePlaceholder')}
                className="resize-none"
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">{t('contactLabel')}</Label>
              <Input
                id="contact"
                name="contact"
                placeholder={t('contactPlaceholder')}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('submitting')}
                </>
              ) : (
                t('submit')
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
