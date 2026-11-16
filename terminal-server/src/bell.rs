//! The terminal bell: the system alert sound, the one the user chose in the
//! system settings and at the volume they set for alerts.

#[cfg(target_os = "macos")]
#[link(name = "AppKit", kind = "framework")]
extern "C" {
    fn NSBeep();
}

/// Play the system alert sound. Does nothing on platforms without one.
pub fn ring() {
    #[cfg(target_os = "macos")]
    unsafe {
        NSBeep()
    }
}
