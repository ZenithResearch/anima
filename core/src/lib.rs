#![cfg_attr(target_arch = "wasm32", no_std)]

#[cfg(target_arch = "wasm32")]
#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! { loop { core::hint::spin_loop(); } }

#[unsafe(no_mangle)]
pub extern "C" fn engine_version() -> u32 { 1 }

// Additive, stateless swimming ABI. Four components share one immutable input
// state, allowing JS to own the handle without WASM globals or linear-memory IO.
fn vector_length(x: f64, y: f64) -> f64 {
    let n = x*x + y*y;
    if n < 1e-12 { return 0.0; }
    let mut r = n.max(1.0);
    for _ in 0..16 { r = 0.5 * (r + n/r); }
    r
}
#[unsafe(no_mangle)]
pub extern "C" fn koi_step(component:u32, x:f64, y:f64, vx:f64, vy:f64,
    gx:f64, gy:f64, px:f64, py:f64, pressure:f64, cruise:f64, dt:f64) -> f64 {
    koi_step_v2(component,x,y,vx,vy,gx,gy,px,py,pressure,cruise,dt,1.0)
}
// Optional metric-aware refinement. Retain the v1 signature for cached clients.
#[unsafe(no_mangle)]
pub extern "C" fn koi_step_v2(component:u32, x:f64, y:f64, vx:f64, vy:f64,
    gx:f64, gy:f64, px:f64, py:f64, pressure:f64, cruise:f64, dt:f64, aspect:f64) -> f64 {
    if ![x,y,vx,vy,gx,gy,px,py,pressure,cruise,dt,aspect].iter().all(|v|v.is_finite()) { return 0.0; }
    if dt <= 0.0 { return match component {0=>x,1=>y,2=>vx,3=>vy,_=>0.0}; }
    let dt=dt.min(1.0/60.0);
    let distance=vector_length(gx-x,gy-y).max(0.001);
    let old_speed=vector_length(vx,vy);
    let (fx,fy)=if old_speed>0.0001 {(vx/old_speed,vy/old_speed)} else {(1.0,0.0)};
    // The rectangular section stretches normalized headings. Limit the rate in
    // rendered water coordinates as well, retaining the same forward arc.
    let aspect=aspect.clamp(0.10,10.0);
    let pace=(fx*fx*aspect+fy*fy/aspect).min(1.0);
    let mut dx=(gx-x)/distance;
    let mut dy=(gy-y)/distance;
    // Anticipate the arc, rather than reaching a wall and reversing velocity.
    // This field changes the destination heading; it never translates the fish
    // sideways. The long look-ahead gives a large body room to come around.
    for (p,v,d) in [(x,vx,&mut dx),(y,vy,&mut dy)] {
        let ahead=p+v*3.5/pace;
        if ahead>0.15 { *d-=(ahead-0.15)*9.0; }
        if ahead< -0.15 { *d+=(-0.15-ahead)*9.0; }
    }
    let disturbance=vector_length(x-px,y-py).max(0.025);
    let repel=pressure.clamp(0.0,1.0)*(1.0-disturbance/0.85).max(0.0)*0.55;
    let desired=vector_length(dx,dy).max(0.001);
    let cross=(fx*dy-fy*dx)/desired;
    let dot=(fx*dx+fy*dy)/desired;
    // A heading limit prevents a 180-degree goal from cancelling forward speed
    // and pivoting in place. Resolve an exactly rearward goal consistently.
    let turn=if dot<0.0 {
        if cross< -0.00001 {-1.0} else {1.0}
    } else {(cross*2.0).clamp(-1.0,1.0)};
    let nudge=(fx*(y-py)-fy*(x-px))/disturbance*repel;
    let angle=(turn*0.30+nudge*0.24).clamp(-0.36,0.36)*pace*dt;
    // Small-angle rotation (|angle| <= .006), renormalized below; no libm.
    let cosine=1.0-angle*angle*0.5;
    let sine=angle*(1.0-angle*angle/6.0);
    let rx=fx*cosine-fy*sine; let ry=fx*sine+fy*cosine;
    let norm=vector_length(rx,ry).max(0.001);
    let edge=x.abs().max(y.abs());
    let clearance=((1.0-edge)/0.35).clamp(0.0,1.0);
    let target=cruise.clamp(0.10,0.18)*(0.45+0.55*clearance)*pace;
    let speed=(old_speed+(target-old_speed)*(dt*1.0))
        .clamp(0.035*pace,(0.035+(1.0-edge).max(0.0)*0.40).min(0.22)*pace);
    let ux=rx/norm*speed; let uy=ry/norm*speed;
    // Last-resort containment only. Preserve heading even for an externally
    // supplied out-of-bounds state; never reflect a velocity component.
    let nx=(x+ux*dt).clamp(-1.0,1.0);
    let ny=(y+uy*dt).clamp(-1.0,1.0);
    match component {0=>nx,1=>ny,2=>ux,3=>uy,_=>0.0}
}

// key: 1 next, 2 previous, 3 first, 4 last. -1 means do not handle.
#[unsafe(no_mangle)]
pub extern "C" fn next_tab(key: u32, index: u32, count: u32) -> i32 {
    if count == 0 || count > 1024 || index >= count { return -1; }
    match key {
        1 => ((index + 1) % count) as i32,
        2 => ((index + count - 1) % count) as i32,
        3 => 0,
        4 => (count - 1) as i32,
        _ => -1,
    }
}

// Process state: high 16 bits = role (0 business, 1 creative), low 16 = step.
// Events: 0 role, 1 select step, 2 next, 3 previous, 4 first, 5 last.
#[unsafe(no_mangle)]
pub extern "C" fn process_count(role: u32) -> u32 {
    match role { 0 => 6, 1 => 5, _ => 0 }
}
#[unsafe(no_mangle)]
pub extern "C" fn process_reduce(state: u32, event: u32, value: u32) -> u32 {
    let mut role = state >> 16;
    let mut step = state & 0xffff;
    if process_count(role) == 0 || step >= process_count(role) { role = 0; step = 0; }
    let count = process_count(role);
    match event {
        0 if value <= 1 => { role = value; step = 0; }
        1 if value < count => step = value,
        2 => step = (step + 1) % count,
        3 => step = (step + count - 1) % count,
        4 => step = 0,
        5 => step = count - 1,
        _ => {}
    }
    (role << 16) | step
}

// Independent preferences. Atmosphere is explicit consent, never inferred.
#[unsafe(no_mangle)]
pub extern "C" fn opportunity_mask(live: u32, digital: u32, atmosphere: u32) -> u32 {
    u32::from(live != 0) | (u32::from(digital != 0) << 1) | (u32::from(atmosphere != 0) << 2)
}
// Additive ABI: retain the three-argument export for older cached clients.
#[unsafe(no_mangle)]
pub extern "C" fn opportunity_mask_v2(live: u32, digital: u32, atmosphere: u32, promotion: u32) -> u32 {
    opportunity_mask(live, digital, atmosphere) | (u32::from(promotion != 0) << 3)
}
#[unsafe(no_mangle)]
pub extern "C" fn opportunities_valid(mask: u32) -> u32 { u32::from(mask & 3 != 0) }
// Expanded roster, additive ABI. Existing masks and validation stay readable.
#[unsafe(no_mangle)]
pub extern "C" fn opportunity_mask_v3(live: u32, digital: u32, atmosphere: u32, promotion: u32, additional: u32) -> u32 {
    opportunity_mask_v2(live, digital, atmosphere, promotion) | (additional & 0x00ff_fff0)
}
#[unsafe(no_mangle)]
pub extern "C" fn opportunities_valid_v2(mask: u32) -> u32 { u32::from(mask & 0x00ff_ffff != 0) }

#[unsafe(no_mangle)]
pub extern "C" fn life_start(hero_bottom: f64, viewport_height: f64) -> f64 {
    hero_bottom.max(viewport_height * 1.35)
}
#[unsafe(no_mangle)]
pub extern "C" fn pond_x(client_x: f64, left: f64, width: f64) -> f64 {
    if width <= 0.0 { return 0.0; }
    ((client_x - left) / width - 0.5) * 8.0
}
#[unsafe(no_mangle)]
pub extern "C" fn pond_y(client_y: f64, top: f64, scroll_y: f64, width: f64) -> f64 {
    if width <= 0.0 { return 0.0; }
    (client_y - top + scroll_y) / width * 8.0
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn koi_pause_and_invalid_input_are_safe() {
        for (i,expected) in [0.2,-0.3,0.4,0.1].iter().enumerate() {
            assert_eq!(koi_step(i as u32,0.2,-0.3,0.4,0.1,0.8,0.8,0.0,0.0,1.0,0.5,0.0),*expected);
        }
        assert_eq!(koi_step(0,f64::NAN,0.0,0.0,0.0,1.0,1.0,0.0,0.0,1.0,0.5,0.01),0.0);
    }
    #[test]
    fn process_role_changes_reset_and_steps_wrap() {
        let last = process_reduce(0, 5, 0);
        assert_eq!(last, 5);
        assert_eq!(process_reduce(last, 2, 0), 0);
        let creative = process_reduce(last, 0, 1);
        assert_eq!(creative, 1 << 16);
        assert_eq!(process_reduce(creative, 3, 0), (1 << 16) | 4);
        assert_eq!(process_reduce(creative, 1, 5), creative);
        assert_eq!(process_reduce(creative, 0, 99), creative);
        assert_eq!(process_reduce(u32::MAX, 4, 0), 0);
    }
    #[test]
    fn navigation_handles_both_process_lengths_and_invalid_input() {
        for count in [5, 6] {
            assert_eq!(next_tab(1, count - 1, count), 0);
            assert_eq!(next_tab(2, 0, count), (count - 1) as i32);
            assert_eq!(next_tab(3, 2, count), 0);
            assert_eq!(next_tab(4, 0, count), (count - 1) as i32);
        }
        assert_eq!(next_tab(1, 0, 0), -1);
        assert_eq!(next_tab(1, 6, 6), -1);
        assert_eq!(next_tab(0, 0, 6), -1);
    }
    #[test]
    fn atmosphere_never_implies_an_opportunity_or_is_inferred() {
        for live in 0..=1 { for digital in 0..=1 { for atmosphere in 0..=1 {
            let mask = opportunity_mask(live, digital, atmosphere);
            assert_eq!(opportunities_valid(mask), u32::from(live != 0 || digital != 0));
            assert_eq!((mask >> 2) & 1, atmosphere);
        } } }
    }
    #[test]
    fn promotion_is_independent_and_preserves_older_preference_bits() {
        for live in 0..=1 { for digital in 0..=1 { for atmosphere in 0..=1 { for promotion in 0..=1 {
            let mask = opportunity_mask_v2(live, digital, atmosphere, promotion);
            assert_eq!(mask & 7, opportunity_mask(live, digital, atmosphere));
            assert_eq!((mask >> 3) & 1, promotion);
            assert_eq!(opportunities_valid(mask), u32::from(live != 0 || digital != 0));
        } } } }
    }
    #[test]
    fn scrolling_preserves_document_coordinates() {
        assert_eq!(pond_y(600.0, 0.0, 0.0, 1200.0), pond_y(200.0, 0.0, 400.0, 1200.0));
        assert_eq!(pond_x(600.0, 0.0, 1200.0), 0.0);
        assert_eq!(pond_y(0.0, 0.0, 0.0, 0.0), 0.0);
        assert!(life_start(950.0, 844.0) >= 950.0);
    }
}
