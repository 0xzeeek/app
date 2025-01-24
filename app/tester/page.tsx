import { createCharacterFile } from '@/functions'

export default async function TestPage() {
  async function handleSubmit(formData: FormData) {
    'use server'
    
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    
    const characterFile = await createCharacterFile(name, description)

    console.log(characterFile)
  }

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test Character File Creation</h1>
      
      <form action={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block mb-2">Name:</label>
          <input 
            type="text"
            id="name"
            name="name"
            className="border p-2 rounded w-full"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block mb-2">Description:</label>
          <textarea
            id="description"
            name="description"
            className="border p-2 rounded w-full h-32"
            required
          />
        </div>

        <button 
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create Character File
        </button>
      </form>
    </main>
  )
}