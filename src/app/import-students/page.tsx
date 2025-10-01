'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Upload, Users, CheckCircle, AlertCircle } from 'lucide-react'

interface StudentData {
  name: string
  email: string
  foodPreference: string
}

export default function StudentImport() {
  const [students, setStudents] = useState<StudentData[]>([
    { name: 'Abhishek pal', email: 'abhishekpal25@navgurukul.org', foodPreference: 'paneer' },
    { name: 'Akash', email: 'akash24@navgurukul.org', foodPreference: 'egg' },
    { name: 'Anurag Arya', email: 'anuragarya25@navgurukul.org', foodPreference: 'paneer' },
    { name: 'Deep Tiwari', email: 'deeptiwaari2025@gmail.com', foodPreference: 'paneer' },
    { name: 'Devendra Dhurvey (꧁रA1꧂)', email: 'devendradhur85@gmail.com', foodPreference: 'paneer' },
    { name: 'Tushar', email: 'tushar24@navgurukul.org', foodPreference: 'paneer' },
    { name: 'Yogesh Kumar', email: 'yogesh25@navgurukul.org', foodPreference: 'paneer' },
    { name: 'lokesh dangwal', email: 'lokesh25@navgurukul.org', foodPreference: 'paneer' },
    { name: 'riyan ramteke', email: 'riyan25@navgurukul.org', foodPreference: 'paneer' },
    { name: 'roshankumar', email: 'roshankumar25@navgurukul.com', foodPreference: 'paneer' },
    { name: 'sumit', email: 'sumi25@navgurukul.org', foodPreference: 'paneer' },
    { name: 'sunil', email: 'sunilkumar25@navgurukul.org', foodPreference: 'paneer' }
  ])
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle')
  const [importMessage, setImportMessage] = useState('')

  const handleAddStudent = () => {
    setStudents([...students, { name: '', email: '', foodPreference: 'paneer' }])
  }

  const handleRemoveStudent = (index: number) => {
    setStudents(students.filter((_, i) => i !== index))
  }

  const handleStudentChange = (index: number, field: keyof StudentData, value: string) => {
    const updatedStudents = [...students]
    updatedStudents[index][field] = value
    setStudents(updatedStudents)
  }

  const handleBulkImport = async () => {
    try {
      setImportStatus('importing')
      
      const response = await fetch('/api/students/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ students })
      })

      if (response.ok) {
        const data = await response.json()
        setImportStatus('success')
        setImportMessage(data.message)
      } else {
        setImportStatus('error')
        setImportMessage('Failed to import students')
      }
    } catch (error) {
      setImportStatus('error')
      setImportMessage('Error importing students')
    }
  }

  const handleCSVImport = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const csvData = event.target.value
    const lines = csvData.trim().split('\n')
    
    const parsedStudents: StudentData[] = []
    
    for (const line of lines) {
      const parts = line.split(',').map(part => part.trim())
      if (parts.length >= 3) {
        parsedStudents.push({
          name: parts[0],
          email: parts[1],
          foodPreference: parts[2].toLowerCase()
        })
      }
    }
    
    if (parsedStudents.length > 0) {
      setStudents(parsedStudents)
    }
  }

  const validStudents = students.filter(s => s.name && s.email && s.foodPreference)
  const paneerCount = validStudents.filter(s => s.foodPreference === 'paneer').length
  const eggCount = validStudents.filter(s => s.foodPreference === 'egg').length

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Student Import Tool
          </CardTitle>
          <CardDescription>
            Import students into the kitchen duty management system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistics */}
          <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Total: {validStudents.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Paneer: {paneerCount}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Egg: {eggCount}</Badge>
            </div>
          </div>

          {/* Import Status */}
          {importStatus !== 'idle' && (
            <div className={`p-4 rounded-lg flex items-center gap-2 ${
              importStatus === 'success' ? 'bg-green-50 text-green-700' :
              importStatus === 'error' ? 'bg-red-50 text-red-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {importStatus === 'success' && <CheckCircle className="h-5 w-5" />}
              {importStatus === 'error' && <AlertCircle className="h-5 w-5" />}
              {importStatus === 'importing' && <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />}
              <span>{importMessage}</span>
            </div>
          )}

          {/* CSV Import */}
          <div>
            <Label htmlFor="csv-import">CSV Import (Name, Email, Food Preference)</Label>
            <Textarea
              id="csv-import"
              placeholder="Abhishek pal, abhishekpal25@navgurukul.org, paneer&#10;Akash, akash24@navgurukul.org, egg"
              className="mt-2"
              onChange={handleCSVImport}
              rows={6}
            />
          </div>

          {/* Manual Entry */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <Label>Manual Student Entry</Label>
              <Button onClick={handleAddStudent} size="sm" variant="outline">
                Add Student
              </Button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {students.map((student, index) => (
                <div key={index} className="flex gap-3 p-3 border rounded-lg">
                  <div className="flex-1">
                    <Input
                      placeholder="Name"
                      value={student.name}
                      onChange={(e) => handleStudentChange(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Email"
                      type="email"
                      value={student.email}
                      onChange={(e) => handleStudentChange(index, 'email', e.target.value)}
                    />
                  </div>
                  <div className="w-32">
                    <Select
                      value={student.foodPreference}
                      onValueChange={(value) => handleStudentChange(index, 'foodPreference', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paneer">Paneer 🧀</SelectItem>
                        <SelectItem value="egg">Egg 🥚</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => handleRemoveStudent(index)}
                    size="sm"
                    variant="destructive"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Import Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleBulkImport}
              disabled={validStudents.length === 0 || importStatus === 'importing'}
              className="px-8"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importStatus === 'importing' ? 'Importing...' : `Import ${validStudents.length} Students`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}