use std::path::{Path, PathBuf};

pub const MAX_RECENT: usize = 10;
pub const STORE_FILE: &str = "recent-projects.json";
pub const STORE_KEY: &str = "paths";

#[derive(Debug, Clone, Default)]
pub struct RecentProjects {
    paths: Vec<String>,
}

impl RecentProjects {
    pub fn from_paths(paths: Vec<String>) -> Self {
        let mut me = Self { paths: vec![] };
        for p in paths {
            me.paths.push(canonicalize_or(&p));
        }
        me.dedupe_in_place();
        me.paths.truncate(MAX_RECENT);
        me
    }

    pub fn paths(&self) -> &[String] {
        &self.paths
    }

    /// Record a freshly-opened project. Canonicalizes the path, removes
    /// any existing copy from the list, prepends the new entry, and caps
    /// the list at MAX_RECENT.
    pub fn record(&mut self, path: &str) {
        let canonical = canonicalize_or(path);
        self.paths.retain(|p| p != &canonical);
        self.paths.insert(0, canonical);
        self.paths.truncate(MAX_RECENT);
    }

    /// Return the recents list with paths that no longer exist filtered out.
    /// The internal list isn't mutated — callers see a fresh view.
    pub fn prune_missing(&self) -> Vec<String> {
        self.paths
            .iter()
            .filter(|p| Path::new(p).exists())
            .cloned()
            .collect()
    }

    /// Search roots for the fuzzy-find-projects feature. Returns the
    /// deduped parent directories of the recents list, falling back to
    /// `[fallback]` (typically `$HOME`) when there are no recents.
    pub fn project_search_roots(&self, fallback: &Path) -> Vec<PathBuf> {
        let mut roots: Vec<PathBuf> = self
            .paths
            .iter()
            .filter_map(|p| Path::new(p).parent().map(|x| x.to_path_buf()))
            .collect();

        roots.sort();
        roots.dedup();

        if roots.is_empty() {
            roots.push(fallback.to_path_buf());
        }
        roots
    }

    fn dedupe_in_place(&mut self) {
        let mut seen = std::collections::HashSet::new();
        self.paths.retain(|p| seen.insert(p.clone()));
    }
}

fn canonicalize_or(path: &str) -> String {
    std::fs::canonicalize(path)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| path.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn record_prepends_new_path() {
        let mut r = RecentProjects::default();
        r.record("/tmp");
        r.record("/usr");
        assert_eq!(r.paths().len(), 2);
        // /usr was recorded most recently — should be first
        assert!(r.paths()[0].contains("usr"));
        assert!(r.paths()[1].contains("tmp"));
    }

    #[test]
    fn record_dedupes_and_moves_to_front() {
        let mut r = RecentProjects::default();
        r.record("/tmp");
        r.record("/usr");
        r.record("/tmp");
        assert_eq!(r.paths().len(), 2);
        assert!(r.paths()[0].contains("tmp"));
        assert!(r.paths()[1].contains("usr"));
    }

    #[test]
    fn record_caps_at_max_recent() {
        let tmp = std::env::temp_dir();
        let mut r = RecentProjects::default();
        // Use real existing dirs so canonicalize succeeds; pad with synthetic
        // string paths to exceed MAX_RECENT
        for i in 0..(MAX_RECENT + 5) {
            let path = tmp.join(format!("preflight-recent-cap-{}", i));
            fs::create_dir_all(&path).unwrap();
            r.record(path.to_str().unwrap());
        }
        assert_eq!(r.paths().len(), MAX_RECENT);
        // cleanup
        for i in 0..(MAX_RECENT + 5) {
            let _ = fs::remove_dir_all(tmp.join(format!("preflight-recent-cap-{}", i)));
        }
    }

    #[test]
    fn prune_missing_drops_nonexistent_paths() {
        let tmp = std::env::temp_dir().join("preflight-recent-prune");
        fs::create_dir_all(&tmp).unwrap();

        let mut r = RecentProjects::default();
        r.record(tmp.to_str().unwrap());
        r.record("/this/path/definitely/does/not/exist/zzz");

        let pruned = r.prune_missing();
        assert_eq!(pruned.len(), 1);
        assert!(pruned[0].contains("preflight-recent-prune"));

        let _ = fs::remove_dir_all(tmp);
    }

    #[test]
    fn project_search_roots_returns_parents_of_recents() {
        let tmp = std::env::temp_dir();
        let parent_a = tmp.join("preflight-roots-a");
        let parent_b = tmp.join("preflight-roots-b");
        let proj_a = parent_a.join("proj");
        let proj_b = parent_b.join("proj");
        fs::create_dir_all(&proj_a).unwrap();
        fs::create_dir_all(&proj_b).unwrap();

        let mut r = RecentProjects::default();
        r.record(proj_a.to_str().unwrap());
        r.record(proj_b.to_str().unwrap());

        let roots = r.project_search_roots(Path::new("/fallback"));
        assert_eq!(roots.len(), 2, "expected 2 distinct parents, got {:?}", roots);
        // sort+dedup means we don't know order, just that both are there
        let stringified: Vec<String> = roots.iter().map(|p| p.to_string_lossy().to_string()).collect();
        assert!(stringified.iter().any(|s| s.contains("preflight-roots-a")));
        assert!(stringified.iter().any(|s| s.contains("preflight-roots-b")));

        let _ = fs::remove_dir_all(parent_a);
        let _ = fs::remove_dir_all(parent_b);
    }

    #[test]
    fn project_search_roots_dedupes_shared_parents() {
        let tmp = std::env::temp_dir();
        let parent = tmp.join("preflight-roots-shared");
        let proj_a = parent.join("proj-a");
        let proj_b = parent.join("proj-b");
        fs::create_dir_all(&proj_a).unwrap();
        fs::create_dir_all(&proj_b).unwrap();

        let mut r = RecentProjects::default();
        r.record(proj_a.to_str().unwrap());
        r.record(proj_b.to_str().unwrap());

        let roots = r.project_search_roots(Path::new("/fallback"));
        assert_eq!(roots.len(), 1);

        let _ = fs::remove_dir_all(parent);
    }

    #[test]
    fn project_search_roots_falls_back_when_empty() {
        let r = RecentProjects::default();
        let roots = r.project_search_roots(Path::new("/home/me"));
        assert_eq!(roots, vec![PathBuf::from("/home/me")]);
    }

    #[test]
    fn from_paths_dedupes_and_caps() {
        let paths: Vec<String> = (0..(MAX_RECENT + 3))
            .map(|i| format!("/synthetic/path/{}", i))
            .chain(std::iter::once("/synthetic/path/0".to_string()))
            .collect();
        let r = RecentProjects::from_paths(paths);
        assert_eq!(r.paths().len(), MAX_RECENT);
    }
}
