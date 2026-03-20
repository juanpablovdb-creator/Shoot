'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  BREAKDOWN_CATEGORIES,
  BREAKDOWN_CATEGORY_ORDER,
} from '@/lib/constants/categories'
import type { BreakdownCategoryKey, IntExt, DayNight } from '@/types'

const INT_EXT: IntExt[] = ['INT', 'EXT']
const DAY_NIGHT: DayNight[] = ['DÍA', 'NOCHE', 'AMANECER', 'ATARDECER']

export interface SceneBreakdownSheetInitialScene {
  scene_number: string
  scene_number_sort: number
  int_ext: IntExt
  day_night: DayNight
  set_name?: string
  location_name?: string
  synopsis?: string
  page_eighths: number
  script_page?: number
  script_day?: number
  unit?: string
  sequence?: string
  location?: string
  est_time?: string
  comments?: string
  scene_note?: string
  scene_from?: string
}

export interface SceneElementRow {
  id: string
  element_id: string
  name: string
  category: string
}

export interface SceneBreakdownSheetProps {
  projectId: string
  sceneId: string
  initialScene: SceneBreakdownSheetInitialScene
  initialElements: SceneElementRow[]
  castByBaseName: Record<string, { cast_number: number; character_name: string }>
  castAppearanceCountsByName: Record<string, number>
}

function baseCharacterName(name: string): string {
  return (name ?? '')
    .trim()
    .replace(/\s*\(\d+\)\s*$/, '')
    .trim()
    .toLowerCase()
}

export function SceneBreakdownSheet({
  projectId,
  sceneId,
  initialScene,
  initialElements,
  castByBaseName,
  castAppearanceCountsByName,
}: SceneBreakdownSheetProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [scene_number, setSceneNumber] = useState(initialScene.scene_number)
  const [int_ext, setIntExt] = useState<IntExt>(initialScene.int_ext)
  const [day_night, setDayNight] = useState<DayNight>(initialScene.day_night)
  const [set_name, setSetName] = useState(initialScene.set_name ?? '')
  const [synopsis, setSynopsis] = useState(initialScene.synopsis ?? '')
  const [page_eighths, setPageEighths] = useState(initialScene.page_eighths)
  const [script_page, setScriptPage] = useState(initialScene.script_page ?? '')
  const [script_day, setScriptDay] = useState(initialScene.script_day ?? '')
  const [unit, setUnit] = useState(initialScene.unit ?? '')
  const [sequence, setSequence] = useState(initialScene.sequence ?? '')
  const [location, setLocation] = useState(initialScene.location ?? '')
  const [est_time, setEstTime] = useState(initialScene.est_time ?? '')
  const [comments, setComments] = useState(initialScene.comments ?? '')
  const [scene_note, setSceneNote] = useState(initialScene.scene_note ?? '')
  const [scene_from, setSceneFrom] = useState(initialScene.scene_from ?? '')

  const [elements, setElements] = useState<SceneElementRow[]>(initialElements)

  const saveScene = useCallback(async () => {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('scenes')
      .update({
        scene_number,
        int_ext,
        day_night,
        set_name: set_name || null,
        synopsis: synopsis || null,
        page_eighths: Number(page_eighths) || 8,
        script_page: script_page ? Number(script_page) : null,
        script_day: script_day ? Number(script_day) : null,
        unit: unit || null,
        sequence: sequence || null,
        location: location || null,
        est_time: est_time || null,
        comments: comments || null,
        scene_note: scene_note || null,
        scene_from: scene_from || null,
      })
      .eq('id', sceneId)
      .eq('project_id', projectId)
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    router.refresh()
  }, [
    sceneId,
    projectId,
    scene_number,
    int_ext,
    day_night,
    set_name,
    synopsis,
    page_eighths,
    script_page,
    script_day,
    unit,
    sequence,
    location,
    est_time,
    comments,
    scene_note,
    scene_from,
    router,
  ])

  const removeElement = useCallback(
    async (sceneElementId: string) => {
      const supabase = createClient()
      const { error: err } = await supabase
        .from('scene_elements')
        .delete()
        .eq('id', sceneElementId)
        .eq('scene_id', sceneId)
      if (err) {
        setError(err.message)
        return
      }
      setElements((prev) => prev.filter((e) => e.id !== sceneElementId))
      router.refresh()
    },
    [sceneId, router]
  )

  const addElement = useCallback(
    async (category: BreakdownCategoryKey, name: string) => {
      if (!name.trim()) return
      const supabase = createClient()
      const trimmedName = name.trim().slice(0, 500)

      const { data: existing } = await supabase
        .from('breakdown_elements')
        .select('id')
        .eq('project_id', projectId)
        .eq('category', category)
        .eq('name', trimmedName)
        .limit(1)
        .maybeSingle()

      let elementId = existing?.id
      if (!elementId) {
        const { data: newEl, error: insErr } = await supabase
          .from('breakdown_elements')
          .insert({ project_id: projectId, category, name: trimmedName })
          .select('id')
          .single()
        if (insErr) {
          setError(insErr.message)
          return
        }
        elementId = newEl?.id
      }
      if (!elementId) return

      const { data: newSe, error: seErr } = await supabase
        .from('scene_elements')
        .insert({ scene_id: sceneId, element_id: elementId })
        .select('id')
        .single()
      if (seErr) {
        setError(seErr.message)
        return
      }
      setElements((prev) =>
        prev.concat({
          id: newSe!.id,
          element_id: elementId!,
          name: trimmedName,
          category,
        })
      )
      router.refresh()
    },
    [projectId, sceneId, router]
  )

  const elementsByCategory = elements.reduce<Record<string, SceneElementRow[]>>(
    (acc, el) => {
      const cat = el.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(el)
      return acc
    },
    {}
  )

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Cabecera tipo Movie Magic */}
      <section
        className="rounded-xl border border-border bg-card p-4 shadow-sm"
        aria-label="Datos de la escena"
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4 lg:grid-cols-6">
          <div>
            <Label className="text-xs text-muted-foreground">Sheet</Label>
            <Input
              value={initialScene.scene_number_sort}
              readOnly
              className="mt-0.5 h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Escena</Label>
            <Input
              value={scene_number}
              onChange={(e) => setSceneNumber(e.target.value)}
              className="mt-0.5 h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Int/Ext</Label>
            <select
              value={int_ext}
              onChange={(e) => setIntExt(e.target.value as IntExt)}
              className="mt-0.5 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {INT_EXT.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Set</Label>
            <Input
              value={set_name}
              onChange={(e) => setSetName(e.target.value)}
              placeholder="Set"
              className="mt-0.5 h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Día/Noche</Label>
            <select
              value={day_night}
              onChange={(e) => setDayNight(e.target.value as DayNight)}
              className="mt-0.5 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {DAY_NIGHT.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Pág(s)</Label>
            <Input
              type="number"
              min={1}
              value={page_eighths}
              onChange={(e) => setPageEighths(Number(e.target.value) || 8)}
              className="mt-0.5 h-8"
            />
          </div>
        </div>
        <div className="mt-3">
          <Label className="text-xs text-muted-foreground">Synopsis</Label>
          <textarea
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            rows={2}
            className="mt-0.5 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
          <div>
            <Label className="text-xs text-muted-foreground">Script Pág(s)</Label>
            <Input
              type="number"
              value={script_page}
              onChange={(e) => setScriptPage(e.target.value)}
              className="mt-0.5 h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Script Day</Label>
            <Input
              type="number"
              value={script_day}
              onChange={(e) => setScriptDay(e.target.value)}
              className="mt-0.5 h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Unit</Label>
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="mt-0.5 h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sequence</Label>
            <Input
              value={sequence}
              onChange={(e) => setSequence(e.target.value)}
              className="mt-0.5 h-8"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs text-muted-foreground">Location</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-0.5 h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Est. Time</Label>
            <Input
              value={est_time}
              onChange={(e) => setEstTime(e.target.value)}
              placeholder="e.g. 0:30"
              className="mt-0.5 h-8"
            />
          </div>
        </div>
        <div className="mt-3">
          <Label className="text-xs text-muted-foreground">Comments</Label>
          <Input
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="mt-0.5 h-8"
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={saveScene} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cabecera'}
          </Button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Panel izquierdo: Elementos por categoría */}
        <section
          className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-2"
          aria-label="Elementos"
        >
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Elementos
          </h3>
          <div className="max-h-[500px] space-y-4 overflow-y-auto">
            {BREAKDOWN_CATEGORY_ORDER.filter(
              (key) => elementsByCategory[key]?.length
            ).map((key) => {
              const config = BREAKDOWN_CATEGORIES[key]
              return (
                <div key={key}>
                  <h4 className="text-xs font-medium text-muted-foreground">
                    {config.label}
                  </h4>
                  <ul className="mt-1 space-y-1">
                    {elementsByCategory[key]?.map((el) => (
                      <li
                        key={el.id}
                        className="flex items-center justify-between gap-2 rounded py-0.5 text-sm"
                      >
                        <span className="text-foreground">
                          {key === 'cast'
                            ? (() => {
                                const base = baseCharacterName(el.name)
                                const info = castByBaseName[base]
                                const count =
                                  castAppearanceCountsByName[base] ?? 0
                                const num = info?.cast_number ?? ''
                                return num
                                  ? `${num}. ${el.name} (${count} apar.)`
                                  : el.name
                              })()
                            : el.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1 text-destructive hover:text-destructive"
                          onClick={() => removeElement(el.id)}
                        >
                          Quitar
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
            {elements.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay elementos en esta escena. Añade desde el panel derecho.
              </p>
            )}
          </div>
        </section>

        {/* Panel derecho: Añadir elemento / detalle */}
        <section
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
          aria-label="Añadir elemento"
        >
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Añadir elemento
          </h3>
          <AddElementForm
            projectId={projectId}
            onAdd={addElement}
            setError={setError}
          />
        </section>
      </div>

      {/* Pie: Note, From */}
      <section
        className="rounded-xl border border-border bg-card p-4 shadow-sm"
        aria-label="Notas"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">Note</Label>
            <Input
              value={scene_note}
              onChange={(e) => setSceneNote(e.target.value)}
              onBlur={saveScene}
              className="mt-0.5 h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              value={scene_from}
              onChange={(e) => setSceneFrom(e.target.value)}
              onBlur={saveScene}
              className="mt-0.5 h-8"
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function AddElementForm({
  projectId,
  onAdd,
  setError,
}: {
  projectId: string
  onAdd: (category: BreakdownCategoryKey, name: string) => Promise<void>
  setError: (s: string | null) => void
}) {
  const [category, setCategory] = useState<BreakdownCategoryKey>('cast')
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setAdding(true)
    setError(null)
    await onAdd(category, name.trim())
    setName('')
    setAdding(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">Categoría</Label>
        <select
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as BreakdownCategoryKey)
          }
          className="mt-0.5 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {BREAKDOWN_CATEGORY_ORDER.map((key) => (
            <option key={key} value={key}>
              {BREAKDOWN_CATEGORIES[key].label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Nombre</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del elemento"
          className="mt-0.5 h-8"
        />
      </div>
      <Button type="submit" size="sm" disabled={adding || !name.trim()}>
        {adding ? 'Añadiendo…' : 'Añadir'}
      </Button>
    </form>
  )
}
