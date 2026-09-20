export interface RegistrationRollbackFailure {
  target: string;
  error: unknown;
}

/** Best-effort cleanup: every uploaded file and the Auth user are attempted. */
export async function rollbackBoutiqueRegistration<TUser>(
  uploadedPaths: string[],
  createdUser: TUser | null,
  deleteUploadedFile: (path: string) => Promise<void>,
  deleteAuthUser: (user: TUser) => Promise<void>,
): Promise<RegistrationRollbackFailure[]> {
  const failures: RegistrationRollbackFailure[] = [];
  for (const path of [...uploadedPaths].reverse()) {
    try {
      await deleteUploadedFile(path);
    } catch (error) {
      failures.push({ target: path, error });
    }
  }
  if (createdUser) {
    try {
      await deleteAuthUser(createdUser);
    } catch (error) {
      failures.push({ target: 'firebase-auth-user', error });
    }
  }
  return failures;
}
