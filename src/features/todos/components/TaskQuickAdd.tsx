import { forwardRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTodos } from '../store'

export const TaskQuickAdd = forwardRef<HTMLInputElement>(function TaskQuickAdd(_props, ref) {
  const { t } = useTranslation()
  const add = useTodos((s) => s.add)
  const [title, setTitle] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (add(title)) setTitle('')
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        ref={ref}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('todos.addPlaceholder')}
        aria-label={t('todos.addAria')}
        maxLength={200}
      />
      <Button
        type="submit"
        variant="default"
        size="icon"
        className="size-10"
        aria-label={t('todos.add')}
        disabled={!title.trim()}
      >
        <Plus />
      </Button>
    </form>
  )
})
