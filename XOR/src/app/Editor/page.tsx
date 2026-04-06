"use client"

import { useState } from "react"
import { AppSidebar } from "../../components/app-sidebar"
import { CodeEditor } from "../../components/code-editor"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Zap } from "lucide-react"

export default function Page() {
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("javascript")
  const [runCode, setRunCode] = useState<(() => void) | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  const handleRunCodeReady = (fn: () => void) => {
    setRunCode(() => fn)
  }

  const handleExecuteClick = async () => {
    if (runCode) {
      setIsExecuting(true)
      await new Promise(resolve => setTimeout(resolve, 50))
      runCode()
      setTimeout(() => setIsExecuting(false), 100)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/Collaborate">Collaborate</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Codespace</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Syncpad Codespace</h2>
              <button
                onClick={handleExecuteClick}
                disabled={!runCode || isExecuting}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                <Zap size={20} />
                {isExecuting ? "Running..." : "Run (Ctrl+Alt+N)"}
              </button>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="jsx">JSX</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="tsx">TSX</SelectItem>
                  <SelectItem value="css">CSS</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="cpp">C++</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border rounded-md overflow-hidden">
              <CodeEditor value={code} onChange={setCode} language={language} onRunCodeReady={handleRunCodeReady} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
