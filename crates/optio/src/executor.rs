use std::path::Path;
use anyhow::Result;
use git2::Repository;

pub struct WorktreeRouter;

impl WorktreeRouter {
    pub fn create_worktree(&self, repo_path: &Path, branch_name: &str, worktree_path: &Path) -> Result<()> {
        let repo = Repository::open(repo_path)?;
        repo.worktree(branch_name, worktree_path, None)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::File;
    use std::io::Write;

    fn setup_repo() -> Result<tempfile::TempDir> {
        let dir = tempdir()?;
        let repo = Repository::init(dir.path())?;
        let mut file = File::create(dir.path().join("file.txt"))?;
        writeln!(file, "initial content")?;

        let mut index = repo.index()?;
        index.add_path(Path::new("file.txt"))?;
        let tree_id = index.write_tree()?;
        let tree = repo.find_tree(tree_id)?;

        let signature = git2::Signature::now("test", "test@test.com")?;
        repo.commit(Some("HEAD"), &signature, &signature, "initial commit", &tree, &[])?;

        Ok(dir)
    }

    #[test]
    fn test_create_worktree() -> Result<()> {
        let repo_dir = setup_repo()?;
        let router = WorktreeRouter;

        let worktree_dir = tempdir()?;
        router.create_worktree(repo_dir.path(), "test-branch", worktree_dir.path())?;

        assert!(worktree_dir.path().join(".git").is_file());

        Ok(())
    }
}
