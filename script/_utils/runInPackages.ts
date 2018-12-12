import * as globby from 'globby';
import { spawn } from 'child_process';
import { readFile } from 'mz/fs';
import { join } from 'path';

export default async function runInPackages(
  stdin: NodeJS.ReadStream,
  stdout: NodeJS.WriteStream,
  stderr: NodeJS.WriteStream,
  command: string,
  args: Array<string> = [],
  packages?: Array<string>
): Promise<void> {
  for (const pkg of await (packages || findPackages())) {
    await runForPackage(stdin, stdout, stderr, pkg, command, args);
  }
}

async function runForPackage(
  stdin: NodeJS.ReadStream,
  stdout: NodeJS.WriteStream,
  stderr: NodeJS.WriteStream,
  pkg: string,
  command: string,
  args: Array<string> = []
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    stdout.write(`${pkg} ❯ ${command} ${args.join(' ')}\n`);

    const child = spawn(
      command,
      args,
      {
        cwd: pkg,
        stdio: [stdin, stdout, stderr]
      });

    child.on('exit', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`exit status was ${code} for command: ${command} args: [${args.join(' ')}]`));
      }
    });

    child.on('error', error => {
      reject(error);
    });
  });
}

async function findPackages(): Promise<Array<string>> {
  const globs = JSON.parse(await readFile(join(__dirname, '../../package.json'), 'utf8')).workspaces;
  return await globby(globs, { onlyDirectories: true });
}