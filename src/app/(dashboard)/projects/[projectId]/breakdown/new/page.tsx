'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { IntExt, DayNight } from '@/types'

const INT_EXT: IntExt[] = ['INT', 'EXT']
const DAY_NIGHT: DayNight[] = ['DÍA', 'NOCHE', 'AMANECER', 'ATARDECER']

export default function NewScenePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [sceneNumber, setSceneNumber] = useState('1')
  const [intExt, setIntExt] = useState<IntExt>('INT')
  const [dayNight, setDayNight] = useState<DayNight>('DÍA')
  const [synopsis, setSynopsis] = useState('')
  const [setName, setSetName] = useState('')
  const [pageEighths, setPageEighths] = useState(8)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { data: existing } = await supabase
      .from('scenes')
      .select('scene_number_sort')
      .eq('project_id', projectId)
      .order('scene_number_sort', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextSort = (existing?.scene_number_sort ?? 0) + 1

    const { data, error: err } = await supabase
      .from('scenes')
      .insert({
        project_id: projectId,
        scene_number: sceneNumber,
        scene_number_sort: nextSort,
        int_ext: intExt,
        day_night: dayNight,
        synopsis: synopsis || null,
        set_name: setName.trim() || 'Sin especificar',
        page_eighths: pageEighths,
        has_stunts: false,
        has_sfx: false,
        has_vfx: false,
      })
      .select('id')
      .single()

    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    if (data?.id)
      router.push(`/projects/${projectId}/breakdown`)
  }

  return (
    <>
      <PageHeader
        title="Nueva escena"
        description="Añadir escena al desglose"
        actions={
          <Link href={`/projects/${projectId}/breakdown`} className={cn(buttonVariants({ variant: 'outline' }))}>
            Volver
          </Link>
        }
      />
      <Card className="mt-6 max-w-xl">
        <CardHeader>
          <CardTitle>Datos de la escena</CardTitle>
          <CardDescription>
            Número, INT o EXT, DÍA o NOCHE y páginas en octavos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sceneNumber">Número de escena</Label>
              <Input
                id="sceneNumber"
                value={sceneNumber}
                onChange={(e) => setSceneNumber(e.target.value)}
                placeholder="1, 2A, 3B..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>INT/EXT</Label>
                <Select value={intExt} onValueChange={(v) => setIntExt(v as IntExt)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INT_EXT.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>DÍA/NOCHE</Label>
                <Select value={dayNight} onValueChange={(v) => setDayNight(v as DayNight)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_NIGHT.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="synopsis">Sinopsis (opcional)</Label>
              <Input
                id="synopsis"
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                placeholder="Breve descripción de la escena"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setName">Set / espacio (opcional)</Label>
              <Input
                id="setName"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder="Ej: Sala · Cocina · Calle principal"
              />
              <p className="text-xs text-muted-foreground">
                Si lo dejas vacío se usará &quot;Sin especificar&quot; (requerido en base de datos).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pageEighths">Páginas (en octavos)</Label>
              <Input
                id="pageEighths"
                type="number"
                min={1}
                max={128}
                value={pageEighths}
                onChange={(e) => setPageEighths(Number(e.target.value) || 8)}
              />
              <p className="text-xs text-muted-foreground">
                Ej: 8 = 1 página, 12 = 1 página y media
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Crear escena'}
              </Button>
              <Link href={`/projects/${projectId}/breakdown`} className={cn(buttonVariants({ variant: 'outline' }))}>
                Cancelar
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
