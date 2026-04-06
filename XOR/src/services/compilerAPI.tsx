type JudgeResponse = {
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  message?: string;
  status: {
    id: number;
    description: string;
  };
};

type ExecutionResult = {
  output: string;
  error: string;
  status: string;
};

// Simple local execution for testing
const executeLocal = (sourceCode: string, languageId: number): ExecutionResult => {
  try {
    // For JavaScript execution (language_id: 102)
    if (languageId === 102) {
      // Capture console.log output
      let output = '';
      const logs: any[] = [];

      // Create a proxy for console
      const customConsole = {
        log: (...args: any[]) => {
          logs.push(args.map(arg => {
            if (typeof arg === 'object') {
              try {
                return JSON.stringify(arg, null, 2);
              } catch {
                return String(arg);
              }
            }
            return String(arg);
          }).join(' '));
        },
        error: (...args: any[]) => logs.push('ERROR: ' + args.join(' ')),
        warn: (...args: any[]) => logs.push('WARN: ' + args.join(' ')),
      };

      // Execute code with custom console
      try {
        const result = new Function('console', sourceCode);
        result(customConsole);
        output = logs.join('\n') || '✓ Code executed successfully (no output)';
      } catch (e) {
        output = logs.join('\n');
        throw e;
      }

      return {
        output,
        error: '',
        status: 'Success'
      };
    }

    // For other languages, show instruction
    return {
      output: `💡 Local execution for language ID ${languageId} is not available.\n\nTo execute ${
        languageId === 105 ? 'C++' :
        languageId === 101 ? 'TypeScript' :
        languageId === 109 ? 'Python' :
        languageId === 91 ? 'Java' : 'this language'
      }, you need to configure Judge0 API:\n\n1. Get your free API key from https://rapidapi.com/judge0-official/api/judge0-ce\n2. Add to .env.local: NEXT_PUBLIC_RAPID_API_KEY=your_key_here\n3. Restart the app\n\nFor now, try Python or JavaScript code with proper console.log() statements.`,
      error: '',
      status: 'Info'
    };
  } catch (err) {
    return {
      output: '',
      error: `❌ Execution error: ${(err as Error).message}`,
      status: 'Error'
    };
  }
};

export const executeCode = async (sourceCode: string, languageId: number): Promise<ExecutionResult> => {
  const apiKey = process.env.NEXT_PUBLIC_RAPID_API_KEY;
  const useRapidAPI = apiKey && apiKey !== 'YOUR_RAPID_API_KEY_HERE';

  // Try public Judge0 endpoint first
  try {
    console.log('🚀 Attempting Judge0 public endpoint...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const submitResponse = await fetch(
      'https://judge0-official.com/api/submissions?base64_encoded=true&wait=true',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          source_code: btoa(sourceCode),
          language_id: languageId,
          stdin: '',
          cpu_time_limit: 5,
          memory_limit: 256000,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!submitResponse.ok) {
      console.error(`❌ Judge0 public failed: ${submitResponse.status}`);
      throw new Error(`HTTP ${submitResponse.status}`);
    }

    const resultData: JudgeResponse = await submitResponse.json();
    console.log('✅ Judge0 public succeeded');

    if (resultData.status?.id >= 6) {
      return {
        output: '',
        error: atob(resultData.stderr || resultData.compile_output || resultData.message || 'Execution failed'),
        status: resultData.status.description
      };
    }

    return {
      output: resultData.stdout ? atob(resultData.stdout) : '(no output)',
      error: '',
      status: 'Success'
    };

  } catch (publicError) {
    console.warn('⚠️ Judge0 public endpoint failed:', (publicError as Error).message);

    // Try RapidAPI if key exists
    if (useRapidAPI) {
      try {
        console.log('🚀 Attempting RapidAPI endpoint...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const submitResponse = await fetch(
          'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true',
          {
            method: 'POST',
            headers: {
              'x-rapidapi-key': apiKey!,
              'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              source_code: btoa(sourceCode),
              language_id: languageId,
              stdin: '',
              cpu_time_limit: 5,
              memory_limit: 256000,
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!submitResponse.ok) {
          throw new Error(`RapidAPI Error: ${submitResponse.status}`);
        }

        const resultData: JudgeResponse = await submitResponse.json();
        console.log('✅ RapidAPI succeeded');

        if (resultData.status?.id >= 6) {
          return {
            output: '',
            error: atob(resultData.stderr || resultData.compile_output || resultData.message || ''),
            status: resultData.status.description
          };
        }

        return {
          output: resultData.stdout ? atob(resultData.stdout) : '',
          error: '',
          status: 'Success'
        };
      } catch (rapidError) {
        console.warn('⚠️ RapidAPI endpoint failed:', (rapidError as Error).message);
      }
    }

    // Fallback to local execution
    console.log('📝 Falling back to local execution...');
    return executeLocal(sourceCode, languageId);
  }
};
