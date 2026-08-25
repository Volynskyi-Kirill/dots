import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { LanguageToggle } from "@/components/language-toggle"

export default function Page() {
  const t = useTranslations("Index")

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div className="flex justify-between items-center mb-4">
          <h1 className="font-medium text-lg">{t("title")}</h1>
          <LanguageToggle />
        </div>
        <div>
          <p>{t("description")}</p>
          <p>{t("buttonAdded")}</p>
          <Button className="mt-2">{t("buttonText")}</Button>
        </div>
        <div className="font-mono text-xs text-muted-foreground mt-4">
          {t("darkModeHint")}
        </div>
      </div>
    </div>
  )
}
